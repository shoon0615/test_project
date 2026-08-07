import { describe, expect, it } from 'vitest';

import { ANALYSIS_VERSION } from '../config/analysis';
import type { RawComment, WorkerResponse } from '../types/domain';
import { validateWorkerResponse } from '../types/domain';
import { runAnalysisWorkerRequest } from './analysis.worker';

describe('runAnalysisWorkerRequest', () => {
  it('runs preprocessing, sentiment, topic, and payload building with valid progress messages', () => {
    const messages: WorkerResponse[] = [];

    runAnalysisWorkerRequest(
      {
        type: 'ANALYZE',
        jobId: 'job-worker',
        configVersion: ANALYSIS_VERSION,
        comments: [
          makeRawComment('c-1', '전달력이 좋고 이해하기 쉬워요'),
          makeRawComment('c-2', 'Audio is bad and the mic volume is too low', 3),
          makeRawComment('c-3', '다음에는 자막 추가 부탁해요'),
        ],
      },
      (message) => messages.push(message),
    );

    expect(messages.every((message) => validateWorkerResponse(message).ok)).toBe(true);
    expect(messages.at(-1)?.type).toBe('RESULT');
    expect(messages.filter((message) => message.type === 'PROGRESS').map((message) => message.stage)).toEqual(
      expect.arrayContaining(['normalizing', 'filtering', 'scoring-sentiment', 'classifying-topics', 'building-payload']),
    );

    const result = messages.at(-1);
    expect(result).toMatchObject({ type: 'RESULT', jobId: 'job-worker' });
    if (result?.type !== 'RESULT') {
      throw new Error('expected result');
    }
    expect(result.payload.sampleSize).toBe(3);
    expect(result.payload.sentimentCounts).toEqual({ positive: 1, neutral: 1, negative: 1 });
    expect(result.payload.comments.map((comment) => comment.id)).toEqual(['c-1', 'c-2', 'c-3']);
    expect(result.payload.comments.map((comment) => comment.topics)).toEqual([['delivery'], ['audio'], ['captions']]);
  });

  it('returns CANCELLED without a result when cancellation wins the race', () => {
    const messages: WorkerResponse[] = [];

    runAnalysisWorkerRequest(
      {
        type: 'ANALYZE',
        jobId: 'job-cancel',
        configVersion: ANALYSIS_VERSION,
        comments: [makeRawComment('c-1', '설명이 좋아요')],
      },
      (message) => messages.push(message),
      () => true,
    );

    expect(messages).toEqual([{ type: 'CANCELLED', jobId: 'job-cancel' }]);
  });

  it('rejects malformed requests through a validated ERROR response', () => {
    const messages: WorkerResponse[] = [];

    runAnalysisWorkerRequest({ type: 'ANALYZE', jobId: 'bad', comments: [{ id: 'missing-fields' }] }, (message) =>
      messages.push(message),
    );

    expect(messages).toEqual([{ type: 'ERROR', jobId: 'bad', code: 'ANALYSIS_FAILED' }]);
    expect(validateWorkerResponse(messages[0]).ok).toBe(true);
  });

  it('emits ANALYSIS_FAILED when pipeline execution throws', () => {
    const messages: WorkerResponse[] = [];
    const brokenComment = {
      id: 'broken',
      text: {
        trim: () => {
          throw new Error('boom');
        },
      },
      likeCount: 0,
      publishedAt: '2026-08-07T00:00:00.000Z',
    };

    runAnalysisWorkerRequest(
      {
        type: 'ANALYZE',
        jobId: 'job-error',
        configVersion: ANALYSIS_VERSION,
        comments: [brokenComment],
      },
      (message) => messages.push(message),
    );

    expect(messages.at(-1)).toEqual({ type: 'ERROR', jobId: 'job-error', code: 'ANALYSIS_FAILED' });
  });
});

function makeRawComment(id: string, text: string, likeCount = 0): RawComment {
  return {
    id,
    text,
    likeCount,
    publishedAt: '2026-08-07T00:00:00.000Z',
  };
}
