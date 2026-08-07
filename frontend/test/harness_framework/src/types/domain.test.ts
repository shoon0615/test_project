import { describe, expect, it } from 'vitest';

import { ANALYSIS_VERSION, REPORT_SCHEMA_VERSION } from '../config/analysis';
import type { AnalysisReport, ExcludeReason } from './domain';
import {
  EXCLUDE_REASONS,
  isAppError,
  validateAnalysisReport,
  validateWorkerRequest,
  validateWorkerResponse,
} from './domain';

const zeroExcludedCounts = (): Record<ExcludeReason, number> =>
  Object.fromEntries(EXCLUDE_REASONS.map((reason) => [reason, 0])) as Record<ExcludeReason, number>;

const validReport = (): AnalysisReport => {
  const excludedCounts = zeroExcludedCounts();
  excludedCounts.duplicate = 1;
  excludedCounts['too-short'] = 1;

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    analysisVersion: ANALYSIS_VERSION,
    reportId: 'report-1',
    jobId: 'job-1',
    video: {
      id: 'abc123_DEF-',
      title: '테스트 영상',
      channelTitle: 'Comment Lens',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg',
      publishedAt: '2026-08-07T00:00:00.000Z',
      commentCount: 12,
    },
    analyzedAt: '2026-08-07T01:00:00.000Z',
    sourceOrder: 'relevance',
    collectionStatus: 'complete',
    warnings: [],
    collectedCount: 12,
    sampleSize: 10,
    excludedCounts,
    sentimentCounts: {
      positive: 6,
      neutral: 3,
      negative: 1,
    },
    strengths: [
      {
        title: '설명이 이해하기 쉽다는 반응',
        description: '수집한 공개 댓글 기준으로 설명을 칭찬하는 반복 반응이 있습니다.',
        mentionCount: 3,
        evidenceCommentIds: ['c1', 'c2', 'c3'],
      },
    ],
    improvements: [],
    contentIdeas: [],
    comments: [
      {
        id: 'c1',
        text: '설명이 정말 좋아요',
        likeCount: 10,
        publishedAt: '2026-08-07T00:01:00.000Z',
        sentiment: 'positive',
        sentimentScore: 0.8,
        confidence: 0.9,
        language: 'ko',
        topics: ['delivery'],
        normalizedHash: 'hash-1',
      },
      {
        id: 'c2',
        text: 'Great explanation',
        likeCount: 4,
        publishedAt: '2026-08-07T00:02:00.000Z',
        sentiment: 'positive',
        sentimentScore: 0.7,
        confidence: 0.8,
        language: 'en',
        topics: ['delivery'],
        normalizedHash: 'hash-2',
      },
      {
        id: 'c3',
        text: '이해가 잘 됩니다',
        likeCount: 2,
        publishedAt: '2026-08-07T00:03:00.000Z',
        sentiment: 'positive',
        sentimentScore: 0.6,
        confidence: 0.7,
        language: 'ko',
        topics: ['delivery'],
        normalizedHash: 'hash-3',
      },
      ...Array.from({ length: 7 }, (_, index) => ({
        id: `c${String(index + 4)}`,
        text: `보통 의견 ${String(index + 4)}`,
        likeCount: index,
        publishedAt: '2026-08-07T00:04:00.000Z',
        sentiment: index < 3 ? ('positive' as const) : index < 6 ? ('neutral' as const) : ('negative' as const),
        sentimentScore: index < 3 ? 0.4 : index < 6 ? 0 : -0.4,
        confidence: 0.5,
        language: 'ko' as const,
        topics: ['content' as const],
        normalizedHash: `hash-${String(index + 4)}`,
      })),
    ],
  };
};

describe('domain validators', () => {
  it('accepts a valid report fixture that satisfies count and evidence invariants', () => {
    const result = validateAnalysisReport(validReport());

    expect(result.ok).toBe(true);
  });

  it('rejects reports with count invariant drift', () => {
    const report = validReport();
    report.sentimentCounts.negative = 2;

    const result = validateAnalysisReport(report);

    expect(result).toEqual({
      ok: false,
      issues: ['sentimentCounts must sum to sampleSize'],
    });
  });

  it('rejects reports whose insight evidence is missing or duplicated', () => {
    const report = validReport();
    const firstStrength = report.strengths[0];
    if (!firstStrength) {
      throw new Error('validReport fixture must include one strength');
    }
    report.strengths[0] = {
      ...firstStrength,
      evidenceCommentIds: ['c1', 'missing', 'c1'],
    };

    const result = validateAnalysisReport(report);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toContain('insight evidenceCommentIds must be unique');
    expect(result.ok ? [] : result.issues).toContain('insight evidenceCommentIds must reference included comments');
  });

  it('rejects ranked insights when the valid sample is below the minimum sample size', () => {
    const report = validReport();
    report.sampleSize = 9;
    report.collectedCount = 11;
    report.sentimentCounts = { positive: 5, neutral: 3, negative: 1 };
    report.comments = report.comments.slice(0, 9);

    const result = validateAnalysisReport(report);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toContain('reports below the minimum sample size cannot include ranked insights');
  });

  it('requires partial reports to preserve the interrupted page and normalized failure code', () => {
    const report = validReport();
    report.collectionStatus = 'partial';
    report.warnings = [{ code: 'PARTIAL_COLLECTION', message: '댓글 일부만 수집됨', collectedCount: 42 }];

    const result = validateAnalysisReport(report);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toContain('partial reports require a warning with page and errorCode');
  });

  it('validates AppError as a safe normalized error contract', () => {
    expect(
      isAppError({
        code: 'NETWORK_ERROR',
        kind: 'network',
        retryable: true,
        stage: 'fetching-comments',
        diagnosticId: 'diag-1',
        safeContext: { page: 2, collectedCount: 100 },
      }),
    ).toBe(true);

    expect(
      isAppError({
        code: 'NETWORK_ERROR',
        kind: 'network',
        retryable: true,
        stage: 'fetching-comments',
        diagnosticId: 'diag-1',
        cause: new Error('memory only'),
      }),
    ).toBe(false);
  });

  it('validates worker request and response boundaries', () => {
    expect(
      validateWorkerRequest({
        type: 'ANALYZE',
        jobId: 'job-1',
        configVersion: ANALYSIS_VERSION,
        comments: [{ id: 'raw-1', text: '좋아요', likeCount: 1, publishedAt: '2026-08-07T00:00:00.000Z' }],
      }).ok,
    ).toBe(true);

    expect(
      validateWorkerResponse({
        type: 'PROGRESS',
        jobId: 'job-1',
        stage: 'scoring-sentiment',
        processed: 10,
        total: 20,
      }).ok,
    ).toBe(true);

    expect(validateWorkerResponse({ type: 'RESULT', jobId: 'job-1', payload: { sampleSize: 10 } }).ok).toBe(false);
    expect(validateWorkerRequest({ type: 'CANCEL', jobId: 1 }).ok).toBe(false);
  });
});
