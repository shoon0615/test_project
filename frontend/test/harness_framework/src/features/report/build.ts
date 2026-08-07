import { ANALYSIS_VERSION, calculateMinimumEvidenceCount, COMMENT_COLLECTION, REPORT_SCHEMA_VERSION } from '../../config/analysis';
import type { SentimentAnalysisResult } from '../sentiment/analyze';
import type { PreprocessedComment, PreprocessLanguage } from '../sentiment/preprocess';
import type { TopicAnalysisResult } from '../topics/analyze';
import {
  EXCLUDE_REASONS,
  type AnalysisReport,
  type AnalyzedComment,
  type AppErrorCode,
  type CollectionStatus,
  type CommentLanguage,
  type ExcludeReason,
  type FeedbackTopic,
  type Insight,
  type ReportWarning,
  type Sentiment,
  type SourceOrder,
  type TopicIntent,
  type VideoSummary,
} from '../../types/domain';
import { CONTENT_IDEA_TEMPLATES, IMPROVEMENT_TEMPLATES, STRENGTH_TEMPLATES } from './templates';

export interface ReportBuilderComment extends PreprocessedComment {
  sentiment: SentimentAnalysisResult;
  topics: TopicAnalysisResult;
}

export interface BuildAnalysisReportInput {
  jobId: string;
  reportId: string;
  analyzedAt: string;
  video: VideoSummary;
  sourceOrder: SourceOrder;
  collectionStatus: CollectionStatus;
  comments: ReportBuilderComment[];
  partialCollection?: {
    page: number;
    errorCode: AppErrorCode;
  };
}

type InsightKind = 'strength' | 'improvement' | 'contentIdea';

interface InsightCandidate {
  topic: FeedbackTopic;
  mentionCount: number;
  comments: ReportBuilderComment[];
  averageConfidence: number;
}

const TOPIC_ORDER: FeedbackTopic[] = [
  'content',
  'delivery',
  'editing',
  'audio',
  'pace',
  'captions',
  'correction',
  'follow-up',
];
const MAX_INSIGHTS_PER_SECTION = 3;
const MAX_EVIDENCE_COMMENTS = 3;
const LIKE_WEIGHT_CAP = 3;

export function buildAnalysisReport(input: BuildAnalysisReportInput): AnalysisReport {
  const analyzedComments = input.comments.map(toAnalyzedComment);
  const includedComments = input.comments.filter((comment) => comment.excludedReason === undefined);
  const excludedCounts = countExcluded(input.comments);
  const sentimentCounts = countSentiments(includedComments);
  const warnings = buildWarnings(input, includedComments.length, excludedCounts);
  const canRankInsights = includedComments.length >= COMMENT_COLLECTION.minimumSampleSize;
  const strengths = canRankInsights ? buildInsights(includedComments, 'strength') : [];
  const improvements = canRankInsights ? buildInsights(includedComments, 'improvement') : [];
  const contentIdeas = canRankInsights ? buildInsights(includedComments, 'contentIdea') : [];

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    analysisVersion: ANALYSIS_VERSION,
    reportId: input.reportId,
    jobId: input.jobId,
    video: input.video,
    analyzedAt: input.analyzedAt,
    sourceOrder: input.sourceOrder,
    collectionStatus: input.collectionStatus,
    warnings,
    collectedCount: input.comments.length,
    sampleSize: includedComments.length,
    excludedCounts,
    sentimentCounts,
    strengths,
    improvements,
    contentIdeas,
    comments: analyzedComments,
  };
}

function toAnalyzedComment(comment: ReportBuilderComment): AnalyzedComment {
  return {
    id: comment.id,
    text: comment.displayText,
    likeCount: comment.likeCount,
    publishedAt: comment.publishedAt,
    sentiment: comment.sentiment.label,
    sentimentScore: comment.sentiment.score,
    confidence: round(Math.max(comment.sentiment.confidence, comment.topics.confidence)),
    language: toDomainLanguage(comment.language),
    topics: comment.topics.topics,
    ...(comment.excludedReason ? { excludedReason: comment.excludedReason } : {}),
    normalizedHash: comment.normalizedHash,
  };
}

function countExcluded(comments: ReportBuilderComment[]): Record<ExcludeReason, number> {
  const counts = zeroExcludedCounts();
  for (const comment of comments) {
    if (comment.excludedReason) {
      counts[comment.excludedReason] += 1;
    }
  }

  return counts;
}

function countSentiments(comments: ReportBuilderComment[]): Record<Sentiment, number> {
  const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const comment of comments) {
    counts[comment.sentiment.label] += 1;
  }

  return counts;
}

function buildWarnings(
  input: BuildAnalysisReportInput,
  sampleSize: number,
  excludedCounts: Record<ExcludeReason, number>,
): ReportWarning[] {
  const warnings: ReportWarning[] = [];

  if (input.collectionStatus === 'partial' && input.partialCollection) {
    warnings.push({
      code: 'PARTIAL_COLLECTION',
      message: `댓글 일부만 수집됨: ${String(input.partialCollection.page)}페이지에서 수집이 중단되어 수집한 공개 댓글 기준으로만 분석했습니다.`,
      page: input.partialCollection.page,
      collectedCount: input.comments.length,
      errorCode: input.partialCollection.errorCode,
    });
  }

  if (sampleSize > 0 && sampleSize < COMMENT_COLLECTION.minimumSampleSize) {
    warnings.push({
      code: 'LOW_SAMPLE',
      message: '유효 표본이 10개 미만이라 순위형 인사이트를 생성하지 않았습니다.',
      collectedCount: input.comments.length,
    });
  }

  if (input.comments.length >= COMMENT_COLLECTION.maxComments) {
    warnings.push({
      code: 'SAMPLE_LIMIT_REACHED',
      message: '상위 댓글 300개 기준으로 분석했습니다.',
      collectedCount: input.comments.length,
    });
  }

  if (excludedCounts['unsupported-language'] > sampleSize) {
    warnings.push({
      code: 'UNSUPPORTED_LANGUAGE_LIMIT',
      message: '지원 언어가 아닌 댓글이 유효 표본보다 많아 결과 해석에 제한이 있습니다.',
      collectedCount: input.comments.length,
    });
  }

  return warnings;
}

function buildInsights(comments: ReportBuilderComment[], kind: InsightKind): Insight[] {
  const threshold = calculateMinimumEvidenceCount(comments.length);
  const candidates = collectCandidates(comments, kind)
    .filter((candidate) => candidate.mentionCount >= threshold)
    .sort(compareCandidates);

  return candidates.slice(0, MAX_INSIGHTS_PER_SECTION).map((candidate) => toInsight(candidate, kind));
}

function collectCandidates(comments: ReportBuilderComment[], kind: InsightKind): InsightCandidate[] {
  const byTopic = new Map<FeedbackTopic, ReportBuilderComment[]>();

  for (const comment of comments) {
    if (!matchesInsightKind(comment, kind)) {
      continue;
    }

    for (const topic of comment.topics.topics) {
      const existing = byTopic.get(topic) ?? [];
      existing.push(comment);
      byTopic.set(topic, existing);
    }
  }

  return Array.from(byTopic.entries()).map(([topic, topicComments]) => ({
    topic,
    mentionCount: topicComments.length,
    comments: topicComments,
    averageConfidence: average(topicComments.map((comment) => Math.max(comment.sentiment.confidence, comment.topics.confidence))),
  }));
}

function matchesInsightKind(comment: ReportBuilderComment, kind: InsightKind): boolean {
  if (comment.topics.topics.length === 0) {
    return false;
  }

  if (kind === 'strength') {
    return comment.sentiment.label === 'positive' || hasIntent(comment, 'praise');
  }

  if (kind === 'improvement') {
    return comment.sentiment.label === 'negative' || hasIntent(comment, 'complaint');
  }

  return hasIntent(comment, 'request') || hasIntent(comment, 'question');
}

function toInsight(candidate: InsightCandidate, kind: InsightKind): Insight {
  const evidenceCommentIds = rankEvidence(candidate.comments).map((comment) => comment.id);

  if (kind === 'strength') {
    const template = STRENGTH_TEMPLATES[candidate.topic];
    return {
      title: template.title,
      description: template.description,
      mentionCount: candidate.mentionCount,
      evidenceCommentIds,
    };
  }

  const template = kind === 'improvement' ? IMPROVEMENT_TEMPLATES[candidate.topic] : CONTENT_IDEA_TEMPLATES[candidate.topic];

  return {
    title: template.title,
    description: template.description,
    mentionCount: candidate.mentionCount,
    evidenceCommentIds,
    action: template.action,
  };
}

function rankEvidence(comments: ReportBuilderComment[]): ReportBuilderComment[] {
  const byHash = new Map<string, ReportBuilderComment>();

  for (const comment of comments.filter((candidate) => candidate.topics.safetyFlags.length === 0)) {
    const previous = byHash.get(comment.normalizedHash);
    if (!previous || compareEvidence(comment, previous) < 0) {
      byHash.set(comment.normalizedHash, comment);
    }
  }

  return Array.from(byHash.values()).sort(compareEvidence).slice(0, MAX_EVIDENCE_COMMENTS);
}

function compareCandidates(left: InsightCandidate, right: InsightCandidate): number {
  return (
    right.mentionCount - left.mentionCount ||
    right.averageConfidence - left.averageConfidence ||
    TOPIC_ORDER.indexOf(left.topic) - TOPIC_ORDER.indexOf(right.topic)
  );
}

function compareEvidence(left: ReportBuilderComment, right: ReportBuilderComment): number {
  return evidenceScore(right) - evidenceScore(left) || left.publishedAt.localeCompare(right.publishedAt) || left.id.localeCompare(right.id);
}

function evidenceScore(comment: ReportBuilderComment): number {
  const likeWeight = Math.min(Math.log1p(comment.likeCount), LIKE_WEIGHT_CAP) / LIKE_WEIGHT_CAP;
  const textWeight = Math.min(comment.normalizedText.length, 180) / 180;

  return round(comment.topics.confidence * 2 + comment.sentiment.confidence + likeWeight + textWeight);
}

function hasIntent(comment: ReportBuilderComment, intent: TopicIntent): boolean {
  return comment.topics.intents.includes(intent);
}

function zeroExcludedCounts(): Record<ExcludeReason, number> {
  return Object.fromEntries(EXCLUDE_REASONS.map((reason) => [reason, 0])) as Record<ExcludeReason, number>;
}

function toDomainLanguage(language: PreprocessLanguage): CommentLanguage {
  if (language === 'mixed') {
    return 'ko';
  }

  return language;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
