import { describe, expect, it, vi } from 'vitest';

import { REPORT_SCHEMA_VERSION } from '../config/analysis';
import type { AnalysisReport, AnalyzedComment, ExcludeReason, Sentiment } from '../types/domain';
import {
  REPORTS_STORAGE_KEY,
  createReportsStorage,
  sanitizeReportForStorage,
} from './reports';

describe('reports storage', () => {
  it('roundtrips valid reports newest first and stores only representative comments', () => {
    const storage = new MemoryStorage();
    const reports = createReportsStorage({ storage });
    const older = makeReport('older', '2026-08-07T00:00:00.000Z');
    const newer = makeReport('newer', '2026-08-07T01:00:00.000Z');

    expect(reports.saveReport(older).ok).toBe(true);
    expect(reports.saveReport(newer).ok).toBe(true);

    const read = reports.readReports();
    expect(read.ok).toBe(true);
    expect(read.ok && read.value.map((report) => report.reportId)).toEqual(['newer', 'older']);
    expect(read.ok && read.value[0]?.comments.map((comment) => comment.id)).toEqual(['newer-c-0', 'newer-c-1', 'newer-c-2']);

    const raw = JSON.parse(storage.getItem(REPORTS_STORAGE_KEY) ?? '[]') as AnalysisReport[];
    expect(raw[0]?.comments.map((comment) => comment.id)).toEqual(['newer-c-0', 'newer-c-1', 'newer-c-2']);
    expect(raw[0]?.comments.some((comment) => comment.text.includes('non representative'))).toBe(false);
  });

  it('keeps the most recent five reports', () => {
    const storage = new MemoryStorage();
    const reports = createReportsStorage({ storage });

    for (let index = 0; index < 6; index += 1) {
      reports.saveReport(makeReport(`r-${String(index)}`, `2026-08-07T0${String(index)}:00:00.000Z`));
    }

    const read = reports.readReports();
    expect(read.ok && read.value.map((report) => report.reportId)).toEqual(['r-5', 'r-4', 'r-3', 'r-2', 'r-1']);
  });

  it('returns an empty list and quarantines the container when JSON is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(REPORTS_STORAGE_KEY, '{broken');

    const read = createReportsStorage({ storage }).readReports();

    expect(read).toMatchObject({
      ok: true,
      value: [],
      quarantined: [{ reason: 'invalid-json' }],
    });
  });

  it('filters only corrupted or unsupported report entries when the stored list is mixed', () => {
    const valid = sanitizeReportForStorage(makeReport('valid', '2026-08-07T00:00:00.000Z'));
    const storage = new MemoryStorage({
      [REPORTS_STORAGE_KEY]: JSON.stringify([
        valid,
        { ...valid, reportId: 'old-schema', schemaVersion: 0 },
        { ...valid, reportId: 'bad-counts', sampleSize: 999 },
      ]),
    });

    const read = createReportsStorage({ storage }).readReports();

    expect(read.ok && read.value.map((report) => report.reportId)).toEqual(['valid']);
    expect(read.ok && read.quarantined.map((item) => item.reportId)).toEqual(['old-schema', 'bad-counts']);
  });

  it('retries once after QuotaExceededError by dropping the oldest candidate', () => {
    const storage = new MemoryStorage();
    const reports = createReportsStorage({ storage });
    for (let index = 0; index < 5; index += 1) {
      reports.saveReport(makeReport(`r-${String(index)}`, `2026-08-07T0${String(index)}:00:00.000Z`));
    }
    storage.failNextSet(new DOMException('quota', 'QuotaExceededError'));

    const saved = reports.saveReport(makeReport('new', '2026-08-07T06:00:00.000Z'));

    expect(saved.ok).toBe(true);
    expect(storage.setCalls).toBe(7);
    expect(saved.ok && saved.value.map((report) => report.reportId)).toEqual(['new', 'r-4', 'r-3', 'r-2']);
  });

  it('returns non-blocking errors for access exceptions and quota retry failure', () => {
    const unavailable = createReportsStorage({ storage: new ThrowingStorage(new Error('blocked')) });
    expect(unavailable.readReports()).toMatchObject({
      ok: false,
      error: { code: 'STORAGE_UNAVAILABLE', retryable: false },
    });

    const quotaStorage = new MemoryStorage();
    quotaStorage.failNextSet(new DOMException('quota', 'QuotaExceededError'));
    quotaStorage.failNextSet(new DOMException('quota again', 'QuotaExceededError'));
    const quotaResult = createReportsStorage({ storage: quotaStorage }).saveReport(makeReport('quota', '2026-08-07T00:00:00.000Z'));
    expect(quotaResult).toMatchObject({
      ok: false,
      error: { code: 'STORAGE_QUOTA_EXCEEDED', retryable: false },
    });
  });

  it('deletes individual reports and clears all reports', () => {
    const storage = new MemoryStorage();
    const reports = createReportsStorage({ storage });
    reports.saveReport(makeReport('a', '2026-08-07T00:00:00.000Z'));
    reports.saveReport(makeReport('b', '2026-08-07T01:00:00.000Z'));

    expect(reports.deleteReport('a')).toMatchObject({ ok: true });
    expect(reports.readReports()).toMatchObject({ ok: true, value: [expect.objectContaining({ reportId: 'b' })] });

    expect(reports.clearReports()).toMatchObject({ ok: true });
    expect(reports.readReports()).toMatchObject({ ok: true, value: [] });
  });

  it('notifies subscribers when another tab updates the reports key', () => {
    const storage = new MemoryStorage();
    const events = new EventTarget();
    const reports = createReportsStorage({ storage, events });
    const listener = vi.fn();
    const unsubscribe = reports.subscribe(listener);
    storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([sanitizeReportForStorage(makeReport('event', '2026-08-07T00:00:00.000Z'))]));

    events.dispatchEvent(new StorageEvent('storage', { key: REPORTS_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ ok: true, value: [expect.objectContaining({ reportId: 'event' })] }));

    unsubscribe();
    events.dispatchEvent(new StorageEvent('storage', { key: REPORTS_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  private readonly setFailures: Error[] = [];
  setCalls = 0;

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, value);
    }
  }

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    const failure = this.setFailures.shift();
    if (failure) {
      throw failure;
    }
    this.data.set(key, value);
  }

  failNextSet(error: Error): void {
    this.setFailures.push(error);
  }
}

class ThrowingStorage extends MemoryStorage {
  constructor(private readonly error: unknown) {
    super();
  }

  override getItem(): string | null {
    throw this.error;
  }
}

function makeReport(reportId: string, analyzedAt: string): AnalysisReport {
  const comments = [
    makeComment(`${reportId}-c-0`, 'positive', 'representative positive'),
    makeComment(`${reportId}-c-1`, 'positive', 'representative positive'),
    makeComment(`${reportId}-c-2`, 'positive', 'representative positive'),
    makeComment(`${reportId}-c-3`, 'neutral', 'non representative neutral'),
    makeComment(`${reportId}-c-4`, 'negative', 'non representative negative'),
    makeComment(`${reportId}-excluded`, 'neutral', 'non representative excluded', 'duplicate'),
  ];

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    analysisVersion: 'comment-lens-rules@0.1.0',
    reportId,
    jobId: `job-${reportId}`,
    video: {
      id: 'abc123_DEF-',
      title: `Video ${reportId}`,
      channelTitle: 'Comment Lens',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg',
      publishedAt: '2026-08-07T00:00:00.000Z',
      commentCount: 11,
    },
    analyzedAt,
    sourceOrder: 'relevance',
    collectionStatus: 'complete',
    warnings: [],
    collectedCount: 11,
    sampleSize: 10,
    excludedCounts: {
      duplicate: 1,
      spam: 0,
      'too-short': 0,
      'unsupported-language': 0,
      'no-analyzable-text': 0,
    },
    sentimentCounts: {
      positive: 8,
      neutral: 1,
      negative: 1,
    },
    strengths: [
      {
        title: '대표 근거',
        description: '대표 댓글만 저장한다.',
        mentionCount: 3,
        evidenceCommentIds: [`${reportId}-c-0`, `${reportId}-c-1`, `${reportId}-c-2`],
      },
    ],
    improvements: [],
    contentIdeas: [],
    comments,
  };
}

function makeComment(
  id: string,
  sentiment: Sentiment,
  text: string,
  excludedReason?: ExcludeReason,
): AnalyzedComment {
  return {
    id,
    text: `${text} ${id}`,
    likeCount: 0,
    publishedAt: '2026-08-07T00:00:00.000Z',
    sentiment,
    sentimentScore: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? -0.7 : 0,
    confidence: 0.8,
    language: 'ko',
    topics: ['content'],
    excludedReason,
    normalizedHash: `hash-${id}`,
  };
}
