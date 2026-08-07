import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_VERSION,
  COMMENT_COLLECTION,
  REPORT_SCHEMA_VERSION,
  REQUEST_POLICY,
  calculateMinimumEvidenceCount,
} from './analysis';

describe('analysis configuration', () => {
  it('centralizes report and collection limits from the product contract', () => {
    expect(REPORT_SCHEMA_VERSION).toBe(1);
    expect(ANALYSIS_VERSION).toMatch(/^comment-lens-rules@\d+\.\d+\.\d+$/);
    expect(COMMENT_COLLECTION.maxComments).toBe(300);
    expect(COMMENT_COLLECTION.pageSize).toBe(100);
    expect(COMMENT_COLLECTION.maxPages).toBe(3);
    expect(COMMENT_COLLECTION.minimumSampleSize).toBe(10);
  });

  it('calculates the minimum evidence threshold as max(3, ceil(sampleSize * 0.05))', () => {
    expect(calculateMinimumEvidenceCount(0)).toBe(3);
    expect(calculateMinimumEvidenceCount(10)).toBe(3);
    expect(calculateMinimumEvidenceCount(60)).toBe(3);
    expect(calculateMinimumEvidenceCount(61)).toBe(4);
    expect(calculateMinimumEvidenceCount(300)).toBe(15);
  });

  it('centralizes timeout and retry policy without implying fake progress', () => {
    expect(REQUEST_POLICY.pageTimeoutMs).toBe(10_000);
    expect(REQUEST_POLICY.jobSoftTimeoutMs).toBe(60_000);
    expect(REQUEST_POLICY.maxRetries).toBe(2);
    expect(REQUEST_POLICY.retryBackoffMs).toEqual([500, 1_500]);
  });
});
