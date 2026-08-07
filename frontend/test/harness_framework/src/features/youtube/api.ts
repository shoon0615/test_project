import { COMMENT_COLLECTION, REQUEST_POLICY } from '../../config/analysis';
import type { AppError, RawComment, ReportWarning, SourceOrder, VideoSummary } from '../../types/domain';
import { createAppError, isAutomaticRetryStatus, isTransientCollectionError, mapYouTubeApiError, type ThrowableAppError } from './errors';
import { parseCommentThreadsResponse, parseVideoListResponse, parseYouTubeErrorPayload } from './schemas';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const VIDEOS_FIELDS =
  'items(id,snippet(title,channelTitle,publishedAt,thumbnails(default(url),medium(url),high(url),standard(url),maxres(url))),statistics(commentCount),status(privacyStatus))';
const COMMENTS_FIELDS = 'nextPageToken,items(id,snippet(topLevelComment(id,snippet(textDisplay,likeCount,publishedAt))))';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CommentCollectionProgress {
  page: number;
  collectedCount: number;
}

export interface CommentCollectionResult {
  comments: RawComment[];
  collectionStatus: 'complete' | 'partial';
  warning?: ReportWarning;
}

export interface YouTubeApiAdapter {
  fetchVideo(input: { videoId: string; signal?: AbortSignal }): Promise<VideoSummary>;
  fetchComments(input: {
    videoId: string;
    order: SourceOrder;
    signal?: AbortSignal;
    onProgress?: (event: CommentCollectionProgress) => void;
  }): Promise<CommentCollectionResult>;
}

export interface YouTubeApiAdapterOptions {
  apiKey?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  createDiagnosticId?: () => string;
}

export function createYouTubeApiAdapter(options: YouTubeApiAdapterOptions = {}): YouTubeApiAdapter {
  const apiKey = options.apiKey ?? readConfiguredApiKey();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? REQUEST_POLICY.pageTimeoutMs;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const createDiagnosticId = options.createDiagnosticId ?? defaultDiagnosticId;

  return {
    async fetchVideo({ videoId, signal }) {
      assertApiKeyConfigured(apiKey, createDiagnosticId, 'fetching-video');

      const url = buildVideosUrl(videoId);
      const payload = await fetchJsonWithPolicy({
        url,
        apiKey,
        fetchImpl,
        signal,
        timeoutMs,
        sleep,
        random,
        stage: 'fetching-video',
        createDiagnosticId,
      });
      const result = parseVideoListResponse(payload);
      if (!result.ok) {
        throw createSchemaError('fetching-video', createDiagnosticId());
      }

      return result.value;
    },

    async fetchComments({ videoId, order, signal, onProgress }) {
      assertApiKeyConfigured(apiKey, createDiagnosticId, 'fetching-comments');

      const comments: RawComment[] = [];
      const commentIds = new Set<string>();
      const seenPageTokens = new Set<string>();
      let pageToken: string | undefined;

      for (let page = 1; page <= COMMENT_COLLECTION.maxPages && comments.length < COMMENT_COLLECTION.maxComments; page += 1) {
        try {
          const url = buildCommentsUrl({ videoId, order, pageToken });
          const payload = await fetchJsonWithPolicy({
            url,
            apiKey,
            fetchImpl,
            signal,
            timeoutMs,
            sleep,
            random,
            stage: 'fetching-comments',
            createDiagnosticId,
            safeContext: { page, collectedCount: comments.length },
          });
          const result = parseCommentThreadsResponse(payload);
          if (!result.ok) {
            throw createSchemaError('fetching-comments', createDiagnosticId(), { page, collectedCount: comments.length });
          }

          appendUniqueComments(comments, commentIds, result.value.comments);
          onProgress?.({ page, collectedCount: comments.length });

          const nextPageToken = result.value.nextPageToken;
          if (!nextPageToken) {
            break;
          }

          if (seenPageTokens.has(nextPageToken)) {
            throw createAppError({
              code: 'PAGINATION_INVALID',
              kind: 'upstream',
              retryable: false,
              stage: 'fetching-comments',
              diagnosticId: createDiagnosticId(),
              safeContext: { page, collectedCount: comments.length },
            });
          }

          seenPageTokens.add(nextPageToken);
          pageToken = nextPageToken;
        } catch (error) {
          const appError = normalizeThrownError(error, 'fetching-comments', createDiagnosticId, { page, collectedCount: comments.length });
          if (page > 1 && comments.length >= COMMENT_COLLECTION.partialSuccessMinimumCollectedCount && isTransientCollectionError(appError)) {
            return {
              comments,
              collectionStatus: 'partial',
              warning: {
                code: 'PARTIAL_COLLECTION',
                message: '댓글 일부만 수집됨',
                page,
                collectedCount: comments.length,
                errorCode: appError.code,
              },
            };
          }

          throw appError;
        }
      }

      if (comments.length === 0) {
        throw createAppError({
          code: 'NO_COMMENTS',
          kind: 'upstream',
          retryable: false,
          stage: 'fetching-comments',
          diagnosticId: createDiagnosticId(),
        });
      }

      return {
        comments,
        collectionStatus: 'complete',
      };
    },
  };
}

function buildVideosUrl(videoId: string): string {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/videos`);
  url.searchParams.set('part', 'snippet,statistics,status');
  url.searchParams.set('id', videoId);
  url.searchParams.set('fields', VIDEOS_FIELDS);

  return url.toString();
}

function buildCommentsUrl(input: { videoId: string; order: SourceOrder; pageToken?: string }): string {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/commentThreads`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', input.videoId);
  url.searchParams.set('maxResults', String(COMMENT_COLLECTION.pageSize));
  url.searchParams.set('order', input.order);
  url.searchParams.set('textFormat', 'plainText');
  url.searchParams.set('fields', COMMENTS_FIELDS);
  if (input.pageToken !== undefined) {
    url.searchParams.set('pageToken', input.pageToken);
  }

  return url.toString();
}

async function fetchJsonWithPolicy(input: {
  url: string;
  apiKey: string;
  fetchImpl: FetchLike;
  signal?: AbortSignal;
  timeoutMs: number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  stage: 'fetching-video' | 'fetching-comments';
  createDiagnosticId: () => string;
  safeContext?: AppError['safeContext'];
}): Promise<unknown> {
  for (let attempt = 0; attempt <= REQUEST_POLICY.maxRetries; attempt += 1) {
    const response = await fetchOnce(input);

    if (response.ok) {
      return parseJsonResponse(response, input.stage, input.createDiagnosticId, input.safeContext);
    }

    const errorPayload = await parseJsonResponseSafely(response);
    const error = mapYouTubeApiError({
      status: response.status,
      reason: parseYouTubeErrorPayload(errorPayload).reason,
      stage: input.stage,
      diagnosticId: input.createDiagnosticId(),
      safeContext: input.safeContext,
    });

    if (isAutomaticRetryStatus(response.status) && attempt < REQUEST_POLICY.maxRetries) {
      await input.sleep(readRetryAfterMs(response) ?? calculateJitterBackoffMs(attempt, input.random));
      continue;
    }

    throw error;
  }

  throw createAppError({
    code: 'UNKNOWN_ERROR',
    kind: 'upstream',
    retryable: false,
    stage: input.stage,
    diagnosticId: input.createDiagnosticId(),
    safeContext: input.safeContext,
  });
}

async function fetchOnce(input: {
  url: string;
  apiKey: string;
  fetchImpl: FetchLike;
  signal?: AbortSignal;
  timeoutMs: number;
  stage: 'fetching-video' | 'fetching-comments';
  createDiagnosticId: () => string;
  safeContext?: AppError['safeContext'];
}): Promise<Response> {
  if (input.signal?.aborted) {
    throw createCancelledError(input.stage, input.createDiagnosticId(), input.safeContext);
  }

  const controller = new AbortController();
  const requestState = { timedOut: false };
  const timeoutId = setTimeout(() => {
    requestState.timedOut = true;
    controller.abort();
  }, input.timeoutMs);

  const abort = () => {
    controller.abort();
  };
  input.signal?.addEventListener('abort', abort, { once: true });

  try {
    return await input.fetchImpl(input.url, {
      headers: {
        'x-goog-api-key': input.apiKey,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (isAppErrorLike(error)) {
      throw error;
    }

    if (input.signal?.aborted) {
      throw createCancelledError(input.stage, input.createDiagnosticId(), input.safeContext);
    }

    if (requestState.timedOut) {
      throw createAppError({
        code: 'REQUEST_TIMEOUT',
        kind: 'network',
        retryable: true,
        stage: input.stage,
        diagnosticId: input.createDiagnosticId(),
        safeContext: input.safeContext,
      });
    }

    throw createAppError({
      code: 'NETWORK_ERROR',
      kind: 'network',
      retryable: true,
      stage: input.stage,
      diagnosticId: input.createDiagnosticId(),
      safeContext: input.safeContext,
    });
  } finally {
    clearTimeout(timeoutId);
    input.signal?.removeEventListener('abort', abort);
  }
}

async function parseJsonResponse(
  response: Response,
  stage: 'fetching-video' | 'fetching-comments',
  createDiagnosticId: () => string,
  safeContext?: AppError['safeContext'],
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw createSchemaError(stage, createDiagnosticId(), safeContext);
  }
}

async function parseJsonResponseSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function appendUniqueComments(target: RawComment[], ids: Set<string>, candidates: RawComment[]): void {
  for (const comment of candidates) {
    if (target.length >= COMMENT_COLLECTION.maxComments) {
      return;
    }

    if (ids.has(comment.id)) {
      continue;
    }

    ids.add(comment.id);
    target.push(comment);
  }
}

function readRetryAfterMs(response: Response): number | undefined {
  const value = response.headers.get('retry-after');
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) {
    return undefined;
  }

  return Math.max(0, dateMs - Date.now());
}

function calculateJitterBackoffMs(attempt: number, random: () => number): number {
  const base = REQUEST_POLICY.retryBackoffMs[Math.min(attempt, REQUEST_POLICY.retryBackoffMs.length - 1)];
  if (base === undefined) {
    return 0;
  }

  return Math.floor(base * random());
}

function assertApiKeyConfigured(apiKey: string, createDiagnosticId: () => string, stage: 'fetching-video' | 'fetching-comments'): void {
  if (apiKey.trim().length > 0) {
    return;
  }

  throw createAppError({
    code: 'API_KEY_MISSING',
    kind: 'configuration',
    retryable: false,
    stage,
    diagnosticId: createDiagnosticId(),
  });
}

function createSchemaError(stage: 'fetching-video' | 'fetching-comments', diagnosticId: string, safeContext?: AppError['safeContext']): ThrowableAppError {
  return createAppError({
    code: 'UPSTREAM_PROCESSING_FAILURE',
    kind: 'upstream',
    retryable: false,
    stage,
    diagnosticId,
    safeContext,
  });
}

function createCancelledError(stage: 'fetching-video' | 'fetching-comments', diagnosticId: string, safeContext?: AppError['safeContext']): ThrowableAppError {
  return createAppError({
    code: 'CANCELLED',
    kind: 'network',
    retryable: false,
    stage,
    diagnosticId,
    safeContext,
  });
}

function normalizeThrownError(
  error: unknown,
  stage: 'fetching-video' | 'fetching-comments',
  createDiagnosticId: () => string,
  safeContext?: AppError['safeContext'],
): ThrowableAppError {
  if (isAppErrorLike(error)) {
    return error;
  }

  return createAppError({
    code: 'UNKNOWN_ERROR',
    kind: 'upstream',
    retryable: false,
    stage,
    diagnosticId: createDiagnosticId(),
    safeContext,
  });
}

function isAppErrorLike(error: unknown): error is ThrowableAppError {
  return typeof error === 'object' && error !== null && 'code' in error && 'diagnosticId' in error;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultDiagnosticId(): string {
  return crypto.randomUUID();
}

function readConfiguredApiKey(): string {
  const env = import.meta.env as Readonly<Record<string, string | undefined>>;

  return env.VITE_YOUTUBE_API_KEY ?? '';
}
