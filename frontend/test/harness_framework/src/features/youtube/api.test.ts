import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMENT_COLLECTION, REQUEST_POLICY } from '../../config/analysis';
import type { AppError } from '../../types/domain';
import { createYouTubeApiAdapter, type FetchLike } from './api';
import { mapYouTubeApiError } from './errors';

const VIDEO_ID = 'AbC123_xY-z';
const API_KEY = 'public-test-key';

interface FetchCall {
  url: URL;
  init?: RequestInit;
}

interface RecordedFetch extends FetchLike {
  calls: FetchCall[];
}

function createFetchMock(responses: Response[]): RecordedFetch {
  const calls: FetchCall[] = [];
  const fetchImpl: RecordedFetch = (input, init) => {
    calls.push({ url: new URL(input), init });
    const response = responses.shift();
    if (!response) {
      return Promise.reject(new Error('unexpected fetch call'));
    }

    return Promise.resolve(response);
  };
  fetchImpl.calls = calls;

  return fetchImpl;
}

function createRejectingFetch(error: unknown): RecordedFetch {
  const calls: FetchCall[] = [];
  const fetchImpl: RecordedFetch = (input, init) => {
    calls.push({ url: new URL(input), init });

    return Promise.reject(error instanceof Error ? error : new Error('rejected'));
  };
  fetchImpl.calls = calls;

  return fetchImpl;
}

function createAbortAwareFetch(): RecordedFetch {
  const calls: FetchCall[] = [];
  const fetchImpl: RecordedFetch = (input, init) => {
    calls.push({ url: new URL(input), init });

    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  };
  fetchImpl.calls = calls;

  return fetchImpl;
}

function responseJson(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function responseText(value: string, status = 200): Response {
  return new Response(value, {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function videoResponse(commentCount = '301') {
  return responseJson({
    items: [
      {
        id: VIDEO_ID,
        snippet: {
          title: '테스트 영상',
          channelTitle: 'Comment Lens',
          publishedAt: '2026-08-07T00:00:00Z',
          thumbnails: {
            default: { url: 'https://i.ytimg.com/vi/default.jpg' },
            high: { url: 'https://i.ytimg.com/vi/high.jpg' },
          },
        },
        statistics: { commentCount },
      },
    ],
  });
}

function commentsResponse(count: number, options: { start?: number; nextPageToken?: string; duplicateEvery?: number } = {}) {
  const start = options.start ?? 0;

  return responseJson({
    nextPageToken: options.nextPageToken,
    items: Array.from({ length: count }, (_, index) => {
      const numericId = start + (options.duplicateEvery ? index % options.duplicateEvery : index);

      return {
        id: `thread-${String(numericId)}`,
        snippet: {
          topLevelComment: {
            id: `comment-${String(numericId)}`,
            snippet: {
              textDisplay: `댓글 ${String(numericId)}`,
              likeCount: numericId,
              publishedAt: '2026-08-07T00:00:00Z',
            },
          },
        },
      };
    }),
  });
}

function errorResponse(status: number, reason: string) {
  return responseJson(
    {
      error: {
        code: status,
        message: `unsafe upstream text ${API_KEY}`,
        errors: [{ reason, message: 'do not expose' }],
      },
    },
    status,
  );
}

function adapter(fetchImpl: RecordedFetch, options: { sleep?: (ms: number) => Promise<void>; random?: () => number } = {}) {
  return createYouTubeApiAdapter({
    apiKey: API_KEY,
    fetchImpl,
    createDiagnosticId: () => 'diag-test',
    sleep: options.sleep ?? (() => Promise.resolve()),
    random: options.random ?? (() => 0),
  });
}

function fetchCalls(fetchImpl: RecordedFetch): FetchCall[] {
  return fetchImpl.calls;
}

function headersOf(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

async function expectAppError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('expected promise to reject');
}

describe('YouTube API adapter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('fetches video metadata through videos.list with a header API key and narrow fields', async () => {
    const fetchImpl = createFetchMock([videoResponse()]);

    const video = await adapter(fetchImpl).fetchVideo({ videoId: VIDEO_ID, signal: new AbortController().signal });
    const [call] = fetchCalls(fetchImpl);

    expect(video).toEqual({
      id: VIDEO_ID,
      title: '테스트 영상',
      channelTitle: 'Comment Lens',
      thumbnailUrl: 'https://i.ytimg.com/vi/high.jpg',
      publishedAt: '2026-08-07T00:00:00Z',
      commentCount: 301,
    });
    expect(call?.url.pathname).toBe('/youtube/v3/videos');
    expect(call?.url.searchParams.get('part')).toBe('snippet,statistics,status');
    expect(call?.url.searchParams.get('id')).toBe(VIDEO_ID);
    expect(call?.url.searchParams.get('fields')).toContain('snippet(title,channelTitle,publishedAt,thumbnails');
    expect(call?.url.searchParams.has('key')).toBe(false);
    expect(headersOf(call?.init).get('x-goog-api-key')).toBe(API_KEY);
  });

  it.each([
    [0, 0],
    [1, 1],
    [100, 100],
    [101, 101],
    [300, 300],
  ])('collects %i comments without exceeding page and count limits', async (total, expected) => {
    const pages =
      total === 0
        ? [commentsResponse(0)]
        : total <= 100
          ? [commentsResponse(total)]
          : total <= 200
            ? [commentsResponse(100, { nextPageToken: 'p2' }), commentsResponse(total - 100, { start: 100 })]
            : [
                commentsResponse(100, { nextPageToken: 'p2' }),
                commentsResponse(100, { start: 100, nextPageToken: 'p3' }),
                commentsResponse(total - 200, { start: 200, nextPageToken: 'ignored' }),
              ];
    const fetchImpl = createFetchMock(pages);

    if (total === 0) {
      const error = await expectAppError(adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' }));
      expect(error.code).toBe('NO_COMMENTS');
      return;
    }

    const progress: { page: number; collectedCount: number }[] = [];
    const result = await adapter(fetchImpl).fetchComments({
      videoId: VIDEO_ID,
      order: 'relevance',
      onProgress: (event) => progress.push({ page: event.page, collectedCount: event.collectedCount }),
    });

    const calls = fetchCalls(fetchImpl);
    expect(result.collectionStatus).toBe('complete');
    expect(result.comments).toHaveLength(expected);
    expect(result.comments.at(-1)?.id).toBe(`comment-${String(expected - 1)}`);
    expect(calls.length).toBe(Math.min(Math.ceil(total / COMMENT_COLLECTION.pageSize), COMMENT_COLLECTION.maxPages));
    expect(calls.every((call) => call.url.pathname === '/youtube/v3/commentThreads')).toBe(true);
    expect(calls.every((call) => call.url.searchParams.get('maxResults') === '100')).toBe(true);
    expect(calls.every((call) => call.url.searchParams.get('textFormat') === 'plainText')).toBe(true);
    expect(calls.every((call) => call.url.searchParams.get('order') === 'relevance')).toBe(true);
    expect(calls.every((call) => !call.url.searchParams.has('key'))).toBe(true);
    expect(progress.at(-1)?.collectedCount).toBe(expected);
  });

  it('supports explicit time ordering and removes duplicate comment IDs while collecting', async () => {
    const fetchImpl = createFetchMock([
      commentsResponse(100, { duplicateEvery: 80, nextPageToken: 'p2' }),
      commentsResponse(30, { start: 80 }),
    ]);

    const result = await adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'time' });
    const calls = fetchCalls(fetchImpl);

    expect(result.comments).toHaveLength(110);
    expect(new Set(result.comments.map((comment) => comment.id)).size).toBe(110);
    expect(calls[0]?.url.searchParams.get('order')).toBe('time');
    expect(calls[1]?.url.searchParams.get('pageToken')).toBe('p2');
  });

  it('rejects malformed API responses at the schema boundary', async () => {
    const fetchImpl = createFetchMock([responseJson({ items: [{ id: VIDEO_ID }] })]);

    const error = await expectAppError(adapter(fetchImpl).fetchVideo({ videoId: VIDEO_ID }));

    expect(error).toMatchObject({
      code: 'UPSTREAM_PROCESSING_FAILURE',
      kind: 'upstream',
      retryable: false,
      stage: 'fetching-video',
      diagnosticId: 'diag-test',
    });
  });

  it.each([
    [403, 'commentsDisabled', 'COMMENTS_DISABLED', false],
    [403, 'quotaExceeded', 'QUOTA_EXCEEDED', false],
    [403, 'forbidden', 'API_FORBIDDEN', false],
    [404, 'videoNotFound', 'VIDEO_NOT_FOUND', false],
    [401, 'keyInvalid', 'API_KEY_INVALID', false],
    [400, 'invalidPageToken', 'INVALID_API_REQUEST', false],
    [429, 'rateLimitExceeded', 'RATE_LIMITED', true],
    [503, 'backendError', 'YOUTUBE_UNAVAILABLE', true],
  ] as const)('maps HTTP %i/%s to %s', (status, reason, code, retryable) => {
    expect(mapYouTubeApiError({ status, reason, stage: 'fetching-comments', diagnosticId: 'diag-test' })).toMatchObject({
      code,
      retryable,
      httpStatus: status,
      upstreamReason: reason,
    });
  });

  it('does not automatically retry non-transient 400/401/403/404 responses', async () => {
    const fetchImpl = createFetchMock([errorResponse(403, 'quotaExceeded')]);

    const error = await expectAppError(adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' }));

    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(fetchImpl.calls).toHaveLength(1);
  });

  it('retries only 429 and 5xx responses using Retry-After or jitter backoff', async () => {
    const sleeps: number[] = [];
    const fetchImpl = createFetchMock([
      errorResponse(429, 'rateLimitExceeded'),
      errorResponse(503, 'backendError'),
      commentsResponse(1),
    ]);

    const result = await adapter(fetchImpl, {
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      random: () => 0.5,
    }).fetchComments({ videoId: VIDEO_ID, order: 'relevance' });

    expect(result.comments).toHaveLength(1);
    expect(fetchImpl.calls).toHaveLength(3);
    expect(sleeps).toEqual([250, 750]);
  });

  it('honors Retry-After seconds before falling back to jitter', async () => {
    const sleeps: number[] = [];
    const fetchImpl = createFetchMock([
      errorResponse(429, 'rateLimitExceeded'),
      responseJson({ items: [] }, 429, { 'retry-after': '2' }),
      commentsResponse(1),
    ]);

    await adapter(fetchImpl, {
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      random: () => 1,
    }).fetchComments({ videoId: VIDEO_ID, order: 'relevance' });

    expect(sleeps).toEqual([500, 2_000]);
  });

  it('returns a partial collection after a later transient page failure with enough collected comments', async () => {
    const fetchImpl = createFetchMock([
      commentsResponse(100, { nextPageToken: 'p2' }),
      errorResponse(503, 'backendError'),
      errorResponse(503, 'backendError'),
      errorResponse(503, 'backendError'),
    ]);

    const result = await adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' });

    expect(result.collectionStatus).toBe('partial');
    expect(result.comments).toHaveLength(100);
    expect(result.warning).toMatchObject({
      code: 'PARTIAL_COLLECTION',
      page: 2,
      collectedCount: 100,
      errorCode: 'YOUTUBE_UNAVAILABLE',
    });
  });

  it('rejects repeated page tokens to prevent pagination loops', async () => {
    const fetchImpl = createFetchMock([commentsResponse(50, { nextPageToken: 'same' }), commentsResponse(50, { start: 50, nextPageToken: 'same' })]);

    const error = await expectAppError(adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' }));

    expect(error).toMatchObject({
      code: 'PAGINATION_INVALID',
      retryable: false,
      stage: 'fetching-comments',
      safeContext: { page: 2, collectedCount: 100 },
    });
  });

  it('normalizes network failures without leaking the API key from upstream messages', async () => {
    const fetchImpl = createRejectingFetch(new TypeError(`failed with ${API_KEY}`));

    const error = await expectAppError(adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' }));

    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
      stage: 'fetching-comments',
    });
    expect(JSON.stringify(error)).not.toContain(API_KEY);
  });

  it('cancels through the user AbortSignal', async () => {
    const controller = new AbortController();
    const fetchImpl = createAbortAwareFetch();

    const promise = adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance', signal: controller.signal });
    controller.abort();
    const error = await expectAppError(promise);

    expect(error.code).toBe('CANCELLED');
    expect(error.retryable).toBe(false);
  });

  it('times out each page request after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetchImpl = createAbortAwareFetch();

    const promise = adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' });
    const errorPromise = expectAppError(promise);
    await vi.advanceTimersByTimeAsync(REQUEST_POLICY.pageTimeoutMs);
    const error = await errorPromise;

    expect(error.code).toBe('REQUEST_TIMEOUT');
    expect(error.retryable).toBe(true);
  });

  it('fails before fetch when the API key is not configured', async () => {
    const fetchImpl = createFetchMock([]);
    const client = createYouTubeApiAdapter({ apiKey: '', fetchImpl, createDiagnosticId: () => 'diag-test' });

    const error = await expectAppError(client.fetchVideo({ videoId: VIDEO_ID }));

    expect(error).toMatchObject({
      code: 'API_KEY_MISSING',
      kind: 'configuration',
      retryable: false,
    });
    expect(fetchImpl.calls).toHaveLength(0);
  });

  it('treats malformed JSON as an upstream processing failure', async () => {
    const fetchImpl = createFetchMock([responseText('{not-json', 200)]);

    const error = await expectAppError(adapter(fetchImpl).fetchComments({ videoId: VIDEO_ID, order: 'relevance' }));

    expect(error.code).toBe('UPSTREAM_PROCESSING_FAILURE');
  });
});
