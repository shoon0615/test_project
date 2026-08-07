import { describe, expect, it, vi } from 'vitest';

import type { AnalysisPayload, AnalysisState, AppError, RawComment, VideoSummary } from '../../types/domain';
import { createAppError } from '../youtube/errors';
import type { CommentCollectionResult, YouTubeApiAdapter } from '../youtube/api';
import { AnalysisOrchestrator, type AnalysisWorkerPort } from './orchestrator';

describe('AnalysisOrchestrator', () => {
  it('runs the complete flow and stores a validated report', async () => {
    const video = makeVideo();
    const comments = makeRawComments(12);
    const payload = makePayload(comments, 12);
    const adapter = makeAdapter({ video, comments: { comments, collectionStatus: 'complete' } });
    const worker = makeWorker(payload);
    const analyze = worker.analyze;
    const storage = makeStorage();
    const states = createStateRecorder();
    const orchestrator = makeOrchestrator({ adapter, worker, storage, dispatch: states.dispatch });

    await orchestrator.submit('https://youtu.be/abc123_DEF-', 'relevance');

    expect(states.latest()).toMatchObject({ status: 'success', report: { jobId: 'job-1', video, sampleSize: 12 } });
    expect(storage.saveReport).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        comments,
      }),
    );
  });

  it('returns empty states for no comments and insufficient partial samples', async () => {
    const video = makeVideo();
    const noCommentsAdapter = makeAdapter({
      video,
      commentsError: createAppError({
        code: 'NO_COMMENTS',
        kind: 'upstream',
        retryable: false,
        stage: 'fetching-comments',
        diagnosticId: 'diag-no-comments',
      }),
    });
    const noCommentsStates = createStateRecorder();
    await makeOrchestrator({ adapter: noCommentsAdapter, dispatch: noCommentsStates.dispatch }).submit('https://youtu.be/abc123_DEF-');
    expect(noCommentsStates.latest()).toMatchObject({ status: 'empty', reason: 'no-comments', video });

    const partialComments = makeRawComments(30);
    const partialStates = createStateRecorder();
    await makeOrchestrator({
      adapter: makeAdapter({
        video,
        comments: {
          comments: partialComments,
          collectionStatus: 'partial',
          warning: { code: 'PARTIAL_COLLECTION', message: '댓글 일부만 수집됨', page: 2, collectedCount: 30, errorCode: 'NETWORK_ERROR' },
        },
      }),
      worker: makeWorker(makePayload(partialComments, 9)),
      dispatch: partialStates.dispatch,
    }).submit('https://youtu.be/abc123_DEF-');
    expect(partialStates.latest()).toMatchObject({ status: 'empty', reason: 'insufficient-sample', video });
  });

  it('keeps normalized API errors distinct', async () => {
    const states = createStateRecorder();
    const error = createAppError({
      code: 'COMMENTS_DISABLED',
      kind: 'permission',
      retryable: false,
      stage: 'fetching-comments',
      diagnosticId: 'diag-disabled',
      httpStatus: 403,
      upstreamReason: 'commentsDisabled',
    });

    await makeOrchestrator({
      adapter: makeAdapter({ video: makeVideo(), commentsError: error }),
      dispatch: states.dispatch,
    }).submit('https://youtu.be/abc123_DEF-');

    expect(states.latest()).toMatchObject({
      status: 'error',
      error: { code: 'COMMENTS_DISABLED', httpStatus: 403, upstreamReason: 'commentsDisabled' },
    });
  });

  it('finalizes a partial success only after worker sample validation', async () => {
    const video = makeVideo();
    const comments = makeRawComments(30);
    const states = createStateRecorder();

    await makeOrchestrator({
      adapter: makeAdapter({
        video,
        comments: {
          comments,
          collectionStatus: 'partial',
          warning: { code: 'PARTIAL_COLLECTION', message: '댓글 일부만 수집됨', page: 3, collectedCount: 30, errorCode: 'YOUTUBE_UNAVAILABLE' },
        },
      }),
      worker: makeWorker(makePayload(comments, 30)),
      dispatch: states.dispatch,
    }).submit('https://youtu.be/abc123_DEF-', 'time');

    expect(states.latest()).toMatchObject({
      status: 'partial-success',
      report: {
        collectionStatus: 'partial',
        sourceOrder: 'time',
        warnings: [expect.objectContaining({ code: 'PARTIAL_COLLECTION', page: 3, errorCode: 'YOUTUBE_UNAVAILABLE' })],
      },
    });
  });

  it('merges duplicate active submit and cancels previous work for a different input', async () => {
    const secondVideo = makeVideo('def456_GHI-');
    const firstVideoDeferred = deferred<VideoSummary>();
    const fetchVideo = vi
      .fn<YouTubeApiAdapter['fetchVideo']>()
      .mockImplementationOnce(({ signal }) => {
        signal?.addEventListener(
          'abort',
          () => {
            firstVideoDeferred.reject(makeCancelledError('fetching-video'));
          },
          { once: true },
        );
        return firstVideoDeferred.promise;
      })
      .mockResolvedValueOnce(secondVideo);
    const adapter: YouTubeApiAdapter = {
      fetchVideo,
      fetchComments: vi.fn<YouTubeApiAdapter['fetchComments']>().mockResolvedValue({
        comments: makeRawComments(12),
        collectionStatus: 'complete',
      }),
    };
    const states = createStateRecorder();
    const orchestrator = makeOrchestrator({ adapter, worker: makeWorker(makePayload(makeRawComments(12), 12)), dispatch: states.dispatch });

    const first = orchestrator.submit('https://youtu.be/abc123_DEF-');
    const duplicate = orchestrator.submit('https://www.youtube.com/watch?v=abc123_DEF-');
    expect(duplicate).toBe(first);
    expect(fetchVideo).toHaveBeenCalledTimes(1);

    await orchestrator.submit('https://youtu.be/def456_GHI-');
    await first.catch(() => undefined);

    expect(fetchVideo).toHaveBeenCalledTimes(2);
    expect(states.latest()).toMatchObject({ status: 'success', report: { video: secondVideo } });
  });

  it('ignores late responses from a cancelled job', async () => {
    const video = makeVideo();
    const comments = makeRawComments(12);
    const workerDeferred = deferred<AnalysisPayload>();
    const states = createStateRecorder();
    const orchestrator = makeOrchestrator({
      adapter: makeAdapter({ video, comments: { comments, collectionStatus: 'complete' } }),
      worker: {
        analyze: vi.fn<AnalysisWorkerPort['analyze']>().mockReturnValue(workerDeferred.promise),
        terminate: vi.fn(),
      },
      dispatch: states.dispatch,
    });

    const running = orchestrator.submit('https://youtu.be/abc123_DEF-');
    await Promise.resolve();
    orchestrator.cancel();
    workerDeferred.resolve(makePayload(comments, 12));
    await running.catch(() => undefined);

    expect(states.latest()).toMatchObject({ status: 'cancelled', jobId: 'job-1' });
  });

  it('adds a non-blocking storage warning without turning success into an error', async () => {
    const comments = makeRawComments(12);
    const states = createStateRecorder();
    await makeOrchestrator({
      adapter: makeAdapter({ video: makeVideo(), comments: { comments, collectionStatus: 'complete' } }),
      worker: makeWorker(makePayload(comments, 12)),
      storage: makeStorage({
        ok: false,
        error: {
          code: 'STORAGE_QUOTA_EXCEEDED',
          retryable: false,
          message: '기기 저장 공간 제한으로 리포트를 저장하지 못했습니다.',
        },
      }),
      dispatch: states.dispatch,
    }).submit('https://youtu.be/abc123_DEF-');

    expect(states.latest()).toMatchObject({
      status: 'success',
      report: { warnings: [expect.objectContaining({ code: 'STORAGE_UNAVAILABLE', errorCode: 'STORAGE_QUOTA_EXCEEDED' })] },
    });
  });
});

function makeOrchestrator(input: {
  adapter: YouTubeApiAdapter;
  worker?: AnalysisWorkerPort;
  storage?: { saveReport: (report: never) => unknown };
  dispatch?: (state: AnalysisState) => void;
}): AnalysisOrchestrator {
  return new AnalysisOrchestrator({
    youtube: input.adapter,
    worker: input.worker ?? makeWorker(makePayload(makeRawComments(12), 12)),
    storage: input.storage as never,
    dispatch: input.dispatch ?? (() => undefined),
    createJobId: createSequentialIds('job'),
    createReportId: createSequentialIds('report'),
    now: () => '2026-08-07T00:00:00.000Z',
    createDiagnosticId: createSequentialIds('diag'),
  });
}

function createStateRecorder(): { dispatch: (state: AnalysisState) => void; latest: () => AnalysisState } {
  const states: AnalysisState[] = [];
  return {
    dispatch: (state) => {
      states.push(state);
    },
    latest: () => {
      const state = states.at(-1);
      if (!state) {
        throw new Error('no state recorded');
      }
      return state;
    },
  };
}

function makeAdapter(input: { video: VideoSummary; comments?: CommentCollectionResult; commentsError?: AppError }): YouTubeApiAdapter {
  return {
    fetchVideo: vi.fn<YouTubeApiAdapter['fetchVideo']>().mockResolvedValue(input.video),
    fetchComments: vi.fn<YouTubeApiAdapter['fetchComments']>().mockImplementation(({ onProgress }) => {
      if (input.commentsError) {
        return Promise.reject(toThrowableAppError(input.commentsError));
      }
      const comments = input.comments ?? { comments: makeRawComments(12), collectionStatus: 'complete' as const };
      onProgress?.({ page: 1, collectedCount: comments.comments.length });
      return Promise.resolve(comments);
    }),
  };
}

function makeWorker(payload: AnalysisPayload): AnalysisWorkerPort {
  return {
    analyze: vi.fn<AnalysisWorkerPort['analyze']>().mockImplementation(({ onProgress }) => {
      onProgress?.({ type: 'PROGRESS', jobId: 'job-1', stage: 'normalizing', processed: payload.sampleSize, total: payload.comments.length });
      return Promise.resolve(payload);
    }),
    terminate: vi.fn(),
  };
}

function makeStorage(result: unknown = { ok: true, value: [] }): { saveReport: ReturnType<typeof vi.fn> } {
  return {
    saveReport: vi.fn().mockReturnValue(result),
  };
}

function makeVideo(id = 'abc123_DEF-'): VideoSummary {
  return {
    id,
    title: '테스트 영상',
    channelTitle: 'Comment Lens',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function makeRawComments(count: number): RawComment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `c-${String(index + 1)}`,
    text: '설명이 좋아요',
    likeCount: index,
    publishedAt: '2026-08-07T00:00:00.000Z',
  }));
}

function makePayload(rawComments: RawComment[], sampleSize: number): AnalysisPayload {
  const includedIds = new Set(rawComments.slice(0, sampleSize).map((comment) => comment.id));
  return {
    comments: rawComments.map((comment) => ({
      ...comment,
      sentiment: includedIds.has(comment.id) ? 'positive' : 'neutral',
      sentimentScore: includedIds.has(comment.id) ? 0.5 : 0,
      confidence: includedIds.has(comment.id) ? 0.8 : 0,
      language: includedIds.has(comment.id) ? 'ko' : 'unsupported',
      topics: includedIds.has(comment.id) ? ['delivery'] : [],
      normalizedHash: `hash-${comment.id}`,
      ...(includedIds.has(comment.id) ? {} : { excludedReason: 'unsupported-language' as const }),
    })),
    sampleSize,
    excludedCounts: {
      duplicate: 0,
      spam: 0,
      'too-short': 0,
      'unsupported-language': rawComments.length - sampleSize,
      'no-analyzable-text': 0,
    },
    sentimentCounts: {
      positive: sampleSize,
      neutral: 0,
      negative: 0,
    },
    strengths: [],
    improvements: [],
    contentIdeas: [],
  };
}

function createSequentialIds(prefix: string): () => string {
  let count = 0;
  return () => `${prefix}-${String((count += 1))}`;
}

function makeCancelledError(stage: AppError['stage']): AppError {
  return {
    code: 'CANCELLED',
    kind: 'network',
    retryable: false,
    stage,
    diagnosticId: 'diag-cancelled',
  };
}

function toThrowableAppError(error: AppError): AppError & Error {
  return Object.assign(new Error(error.code), error);
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}
