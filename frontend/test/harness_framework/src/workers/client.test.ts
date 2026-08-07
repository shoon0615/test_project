import { describe, expect, it, vi } from 'vitest';

import { ANALYSIS_VERSION } from '../config/analysis';
import type { AnalysisPayload, RawComment, WorkerRequest } from '../types/domain';
import { AnalysisWorkerClient, AnalysisWorkerClientError, type WorkerLike } from './client';

describe('AnalysisWorkerClient', () => {
  it('posts only the required comment fields and resolves with progress callbacks', async () => {
    const worker = new FakeWorker();
    const onProgress = vi.fn();
    const client = new AnalysisWorkerClient({ createWorker: () => worker });
    const promise = client.analyze({
      jobId: 'job-client',
      comments: [
        {
          id: 'c-1',
          text: '좋아요',
          likeCount: 5,
          publishedAt: '2026-08-07T00:00:00.000Z',
          authorDisplayName: 'must not cross boundary',
        } as RawComment & { authorDisplayName: string },
      ],
      onProgress,
    });

    expect(worker.requests).toEqual([
      {
        type: 'ANALYZE',
        jobId: 'job-client',
        configVersion: ANALYSIS_VERSION,
        comments: [{ id: 'c-1', text: '좋아요', likeCount: 5, publishedAt: '2026-08-07T00:00:00.000Z' }],
      },
    ]);

    worker.emit({ type: 'PROGRESS', jobId: 'job-client', stage: 'normalizing', processed: 1, total: 1 });
    worker.emit({ type: 'RESULT', jobId: 'job-client', payload: makePayload('c-1') });

    await expect(promise).resolves.toEqual(makePayload('c-1'));
    expect(onProgress).toHaveBeenCalledWith({ type: 'PROGRESS', jobId: 'job-client', stage: 'normalizing', processed: 1, total: 1 });
    expect(worker.terminated).toBe(false);
  });

  it('cancels through AbortSignal and discards a late result', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const client = new AnalysisWorkerClient({ createWorker: () => worker });
    const promise = client.analyze({
      jobId: 'job-abort',
      comments: [makeRawComment('c-1')],
      signal: controller.signal,
    });

    controller.abort();
    worker.emit({ type: 'RESULT', jobId: 'job-abort', payload: makePayload('c-1') });
    worker.emit({ type: 'CANCELLED', jobId: 'job-abort' });

    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(worker.requests.at(-1)).toEqual({ type: 'CANCEL', jobId: 'job-abort' });
  });

  it('ignores stale and malformed worker messages', async () => {
    const worker = new FakeWorker();
    const onProgress = vi.fn();
    const client = new AnalysisWorkerClient({ createWorker: () => worker });
    const promise = client.analyze({ jobId: 'current-job', comments: [makeRawComment('c-1')], onProgress });

    worker.emit({ type: 'PROGRESS', jobId: 'old-job', stage: 'normalizing', processed: 1, total: 1 });
    worker.emit({ type: 'PROGRESS', jobId: 'current-job', stage: 'unknown', processed: 1, total: 1 });
    worker.emit({ type: 'RESULT', jobId: 'current-job', payload: makePayload('c-1') });

    await expect(promise).resolves.toEqual(makePayload('c-1'));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('recreates the worker once after a crash and retries the same payload', async () => {
    const first = new FakeWorker();
    const second = new FakeWorker();
    const createWorker = vi.fn<() => WorkerLike>().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new AnalysisWorkerClient({ createWorker });
    const promise = client.analyze({ jobId: 'job-retry', comments: [makeRawComment('c-1')] });

    first.crash();
    expect(first.terminated).toBe(true);
    expect(second.requests).toEqual(first.requests);

    second.emit({ type: 'RESULT', jobId: 'job-retry', payload: makePayload('c-1') });

    await expect(promise).resolves.toEqual(makePayload('c-1'));
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('does not recreate the worker repeatedly after a second crash', async () => {
    const first = new FakeWorker();
    const second = new FakeWorker();
    const createWorker = vi.fn<() => WorkerLike>().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = new AnalysisWorkerClient({ createWorker });
    const promise = client.analyze({ jobId: 'job-repeat-crash', comments: [makeRawComment('c-1')] });

    first.crash();
    second.crash();

    await expect(promise).rejects.toMatchObject({ code: 'WORKER_INIT_FAILED' });
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('rejects worker ERROR responses', async () => {
    const worker = new FakeWorker();
    const client = new AnalysisWorkerClient({ createWorker: () => worker });
    const promise = client.analyze({ jobId: 'job-error', comments: [makeRawComment('c-1')] });

    worker.emit({ type: 'ERROR', jobId: 'job-error', code: 'ANALYSIS_FAILED' });

    await expect(promise).rejects.toBeInstanceOf(AnalysisWorkerClientError);
    await expect(promise).rejects.toMatchObject({ code: 'ANALYSIS_FAILED' });
  });
});

class FakeWorker implements WorkerLike {
  requests: WorkerRequest[] = [];
  terminated = false;
  private messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  private errorListeners = new Set<EventListener>();

  postMessage(message: WorkerRequest): void {
    this.requests.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  addEventListener(type: 'message' | 'error', listener: EventListener): void {
    if (type === 'message') {
      this.messageListeners.add(listener);
      return;
    }
    this.errorListeners.add(listener);
  }

  removeEventListener(type: 'message' | 'error', listener: EventListener): void {
    if (type === 'message') {
      this.messageListeners.delete(listener);
      return;
    }
    this.errorListeners.delete(listener);
  }

  emit(message: unknown): void {
    for (const listener of this.messageListeners) {
      listener(new MessageEvent('message', { data: message }));
    }
  }

  crash(): void {
    for (const listener of this.errorListeners) {
      listener(new Event('error'));
    }
  }
}

function makeRawComment(id: string): RawComment {
  return {
    id,
    text: '설명이 좋아요',
    likeCount: 0,
    publishedAt: '2026-08-07T00:00:00.000Z',
  };
}

function makePayload(id: string): AnalysisPayload {
  return {
    comments: [
      {
        id,
        text: '설명이 좋아요',
        likeCount: 0,
        publishedAt: '2026-08-07T00:00:00.000Z',
        sentiment: 'positive',
        sentimentScore: 0.5,
        confidence: 0.8,
        language: 'ko',
        topics: ['delivery'],
        normalizedHash: `hash-${id}`,
      },
    ],
    sampleSize: 1,
    excludedCounts: {
      duplicate: 0,
      spam: 0,
      'too-short': 0,
      'unsupported-language': 0,
      'no-analyzable-text': 0,
    },
    sentimentCounts: {
      positive: 1,
      neutral: 0,
      negative: 0,
    },
    strengths: [],
    improvements: [],
    contentIdeas: [],
  };
}
