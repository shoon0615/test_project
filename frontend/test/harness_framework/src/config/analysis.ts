export const REPORT_SCHEMA_VERSION = 1;

export const ANALYSIS_VERSION = 'comment-lens-rules@0.1.0';

export const COMMENT_COLLECTION = {
  maxComments: 300,
  pageSize: 100,
  maxPages: 3,
  minimumSampleSize: 10,
  partialSuccessMinimumCollectedCount: 30,
  minimumEvidenceRatio: 0.05,
  minimumEvidenceCount: 3,
} as const;

export const REQUEST_POLICY = {
  pageTimeoutMs: 10_000,
  jobSoftTimeoutMs: 60_000,
  maxRetries: 2,
  retryBackoffMs: [500, 1_500],
} as const;

export const SENTIMENT_ANALYSIS = {
  minimumAbsoluteScore: 0.18,
  minimumScoreDifference: 0.28,
  negationWindow: 3,
  contrastBeforeWeight: 0.65,
  contrastAfterWeight: 1.35,
  maxConfidenceEvidence: 5,
} as const;

export function calculateMinimumEvidenceCount(sampleSize: number): number {
  const normalizedSampleSize = Math.max(0, Math.floor(sampleSize));

  return Math.max(
    COMMENT_COLLECTION.minimumEvidenceCount,
    Math.ceil(normalizedSampleSize * COMMENT_COLLECTION.minimumEvidenceRatio),
  );
}
