import { describe, expect, it } from 'vitest';

import { ANALYSIS_VERSION, calculateMinimumEvidenceCount } from '../../config/analysis';
import type {
  CommentLanguage,
  CommentSafetyFlag,
  FeedbackTopic,
  Sentiment,
  TopicIntent,
} from '../../types/domain';
import { validateAnalysisReport } from '../../types/domain';
import { buildAnalysisReport, type ReportBuilderComment } from './build';
import { calculateLargestRemainderPercentages } from './rounding';

const video = {
  id: 'abc123_DEF-',
  title: '테스트 영상',
  channelTitle: 'Comment Lens',
  thumbnailUrl: 'https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg',
  publishedAt: '2026-08-07T00:00:00.000Z',
  commentCount: 300,
};

describe('calculateLargestRemainderPercentages', () => {
  it('rounds displayed sentiment ratios to exactly 100 with largest remainder', () => {
    expect(calculateLargestRemainderPercentages({ positive: 1, neutral: 1, negative: 1 })).toEqual({
      positive: 34,
      neutral: 33,
      negative: 33,
    });
    expect(calculateLargestRemainderPercentages({ positive: 0, neutral: 0, negative: 0 })).toEqual({
      positive: 0,
      neutral: 0,
      negative: 0,
    });
  });
});

describe('buildAnalysisReport', () => {
  it.each([
    { sampleSize: 0, minimumEvidence: 3, expectsInsights: false },
    { sampleSize: 9, minimumEvidence: 3, expectsInsights: false },
    { sampleSize: 10, minimumEvidence: 3, expectsInsights: true },
    { sampleSize: 59, minimumEvidence: 3, expectsInsights: true },
    { sampleSize: 60, minimumEvidence: 3, expectsInsights: true },
    { sampleSize: 300, minimumEvidence: 15, expectsInsights: true },
  ])(
    'builds a valid deterministic report for $sampleSize valid samples',
    ({ sampleSize, minimumEvidence, expectsInsights }) => {
      expect(calculateMinimumEvidenceCount(sampleSize)).toBe(minimumEvidence);

      const comments = makeComments(sampleSize, { topic: 'delivery', intent: 'praise', sentiment: 'positive' });
      const first = buildAnalysisReport({
        jobId: 'job-size',
        reportId: 'report-size',
        analyzedAt: '2026-08-07T01:00:00.000Z',
        video,
        sourceOrder: 'relevance',
        collectionStatus: 'complete',
        comments,
      });
      const second = buildAnalysisReport({
        jobId: 'job-size',
        reportId: 'report-size',
        analyzedAt: '2026-08-07T01:00:00.000Z',
        video,
        sourceOrder: 'relevance',
        collectionStatus: 'complete',
        comments,
      });

      expect(first).toEqual(second);
      expect(first.analysisVersion).toBe(ANALYSIS_VERSION);
      expect(first.sampleSize).toBe(sampleSize);
      expect(first.collectedCount).toBe(sampleSize);
      expect(first.sentimentCounts.positive).toBe(sampleSize);
      expect(first.strengths.length > 0).toBe(expectsInsights);
      expect(first.improvements).toEqual([]);
      expect(first.contentIdeas).toEqual([]);
      expect(validateAnalysisReport(first)).toEqual({ ok: true, value: first });
    },
  );

  it('counts excluded comments and never weights sentiment counts by likes', () => {
    const comments = [
      ...makeComments(3, { topic: 'audio', intent: 'praise', sentiment: 'positive', likeCount: 1000 }),
      ...makeComments(4, { topic: 'audio', intent: 'complaint', sentiment: 'negative', start: 10, likeCount: 0 }),
      ...makeComments(3, { topic: 'content', intent: 'request', sentiment: 'neutral', start: 20 }),
      makeExcludedComment('duplicate-1', 'duplicate'),
      makeExcludedComment('short-1', 'too-short'),
    ];

    const report = buildAnalysisReport({
      jobId: 'job-counts',
      reportId: 'report-counts',
      analyzedAt: '2026-08-07T01:00:00.000Z',
      video,
      sourceOrder: 'time',
      collectionStatus: 'complete',
      comments,
    });

    expect(report.collectedCount).toBe(12);
    expect(report.sampleSize).toBe(10);
    expect(report.excludedCounts).toMatchObject({ duplicate: 1, 'too-short': 1 });
    expect(report.sentimentCounts).toEqual({ positive: 3, neutral: 3, negative: 4 });
    expect(validateAnalysisReport(report).ok).toBe(true);
  });

  it('requires distinct evidence, caps insights at three, and excludes unsafe comments from representative evidence', () => {
    const comments = [
      ...makeComments(4, { topic: 'delivery', intent: 'praise', sentiment: 'positive', likeCount: 5 }),
      makeComment('unsafe-delivery', {
        topic: 'delivery',
        intent: 'praise',
        sentiment: 'positive',
        likeCount: 1000,
        safetyFlags: ['personal-attack'],
      }),
      ...makeComments(3, { topic: 'audio', intent: 'praise', sentiment: 'positive', start: 10, likeCount: 2 }),
      ...makeComments(3, { topic: 'editing', intent: 'praise', sentiment: 'positive', start: 20, likeCount: 1 }),
      ...makeComments(3, { topic: 'content', intent: 'praise', sentiment: 'positive', start: 30, likeCount: 0 }),
      ...makeComments(2, { topic: 'pace', intent: 'praise', sentiment: 'positive', start: 40 }),
    ];

    const report = buildAnalysisReport({
      jobId: 'job-evidence',
      reportId: 'report-evidence',
      analyzedAt: '2026-08-07T01:00:00.000Z',
      video,
      sourceOrder: 'relevance',
      collectionStatus: 'complete',
      comments,
    });

    expect(report.strengths).toHaveLength(3);
    expect(report.strengths.map((insight) => insight.title)).toEqual([
      '전달력이 긍정적으로 언급됨',
      '내용이 긍정적으로 언급됨',
      '편집이 긍정적으로 언급됨',
    ]);
    expect(report.strengths[0]?.mentionCount).toBe(5);
    expect(report.strengths[0]?.evidenceCommentIds).toHaveLength(3);
    expect(report.strengths[0]?.evidenceCommentIds).not.toContain('unsafe-delivery');
    expect(new Set(report.strengths[0]?.evidenceCommentIds).size).toBe(report.strengths[0]?.evidenceCommentIds.length);
    expect(report.strengths.some((insight) => insight.title.includes('영상 속도'))).toBe(false);
    expect(validateAnalysisReport(report).ok).toBe(true);
  });

  it('creates improvement actions and content ideas only when the evidence threshold is met', () => {
    const comments = [
      ...makeComments(3, { topic: 'audio', intent: 'complaint', sentiment: 'negative', likeCount: 4 }),
      ...makeComments(3, { topic: 'follow-up', intent: 'request', sentiment: 'neutral', start: 10, likeCount: 3 }),
      ...makeComments(2, { topic: 'captions', intent: 'request', sentiment: 'neutral', start: 20 }),
      ...makeComments(4, { topic: 'content', intent: 'praise', sentiment: 'positive', start: 30 }),
    ];

    const report = buildAnalysisReport({
      jobId: 'job-insights',
      reportId: 'report-insights',
      analyzedAt: '2026-08-07T01:00:00.000Z',
      video,
      sourceOrder: 'relevance',
      collectionStatus: 'complete',
      comments,
    });

    expect(report.improvements).toHaveLength(1);
    expect(report.improvements[0]).toMatchObject({
      title: '음향 개선 요청',
      mentionCount: 3,
      action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 마이크 볼륨과 배경음악 균형을 점검하세요.',
    });
    expect(report.contentIdeas).toHaveLength(1);
    expect(report.contentIdeas[0]).toMatchObject({
      title: '후속 콘텐츠 요청',
      mentionCount: 3,
    });
    expect(report.contentIdeas.some((insight) => insight.title.includes('자막'))).toBe(false);
    expect(validateAnalysisReport(report).ok).toBe(true);
  });

  it('preserves partial collection warnings with page and normalized error code', () => {
    const report = buildAnalysisReport({
      jobId: 'job-partial',
      reportId: 'report-partial',
      analyzedAt: '2026-08-07T01:00:00.000Z',
      video,
      sourceOrder: 'relevance',
      collectionStatus: 'partial',
      comments: makeComments(30, { topic: 'delivery', intent: 'praise', sentiment: 'positive' }),
      partialCollection: {
        page: 3,
        errorCode: 'YOUTUBE_UNAVAILABLE',
      },
    });

    expect(report.warnings).toEqual([
      {
        code: 'PARTIAL_COLLECTION',
        message: '댓글 일부만 수집됨: 3페이지에서 수집이 중단되어 수집한 공개 댓글 기준으로만 분석했습니다.',
        page: 3,
        collectedCount: 30,
        errorCode: 'YOUTUBE_UNAVAILABLE',
      },
    ]);
    expect(validateAnalysisReport(report).ok).toBe(true);
  });
});

function makeComments(
  count: number,
  options: {
    topic: FeedbackTopic;
    intent: TopicIntent;
    sentiment: Sentiment;
    start?: number;
    likeCount?: number;
  },
): ReportBuilderComment[] {
  return Array.from({ length: count }, (_, index) =>
    makeComment(`c-${String((options.start ?? 0) + index).padStart(3, '0')}`, options),
  );
}

function makeComment(
  id: string,
  options: {
    topic: FeedbackTopic;
    intent: TopicIntent;
    sentiment: Sentiment;
    likeCount?: number;
    safetyFlags?: CommentSafetyFlag[];
  },
): ReportBuilderComment {
  const score = options.sentiment === 'positive' ? 0.7 : options.sentiment === 'negative' ? -0.7 : 0;

  return {
    id,
    text: `${options.topic} ${options.intent} evidence ${id}`,
    likeCount: options.likeCount ?? 0,
    publishedAt: '2026-08-07T00:00:00.000Z',
    displayText: `${options.topic} ${options.intent} evidence ${id}`,
    normalizedText: `${options.topic} ${options.intent} evidence ${id}`,
    normalizedHash: `hash-${id}`,
    language: 'ko' satisfies CommentLanguage,
    sentiment: {
      label: options.sentiment,
      score,
      confidence: options.sentiment === 'neutral' ? 0.4 : 0.8,
      ruleHits: [],
    },
    topics: {
      topics: [options.topic],
      intents: [options.intent],
      safetyFlags: options.safetyFlags ?? [],
      confidence: 0.8,
      ruleHits: [],
      ruleSetVersion: 'comment-lens-topics@0.1.0',
    },
  };
}

function makeExcludedComment(
  id: string,
  excludedReason: ReportBuilderComment['excludedReason'],
): ReportBuilderComment {
  return {
    ...makeComment(id, { topic: 'content', intent: 'praise', sentiment: 'neutral' }),
    excludedReason,
  };
}
