import type { AppError, AppErrorCode, AppErrorKind, AppStage } from '../../types/domain';

interface YouTubeApiErrorInput {
  status: number;
  reason?: string;
  stage: AppStage;
  diagnosticId: string;
  safeContext?: AppError['safeContext'];
}

interface AppErrorInput {
  code: AppErrorCode;
  kind: AppErrorKind;
  retryable: boolean;
  stage: AppStage;
  diagnosticId: string;
  httpStatus?: number;
  upstreamReason?: string;
  safeContext?: AppError['safeContext'];
}

export type ThrowableAppError = AppError & Error;

export function createAppError(input: AppErrorInput): ThrowableAppError {
  const error = new Error(input.code) as ThrowableAppError;

  Object.assign(error, {
    code: input.code,
    kind: input.kind,
    retryable: input.retryable,
    stage: input.stage,
    diagnosticId: input.diagnosticId,
    ...(input.httpStatus === undefined ? {} : { httpStatus: input.httpStatus }),
    ...(input.upstreamReason === undefined ? {} : { upstreamReason: input.upstreamReason }),
    ...(input.safeContext === undefined ? {} : { safeContext: input.safeContext }),
  });

  return error;
}

export function mapYouTubeApiError(input: YouTubeApiErrorInput): ThrowableAppError {
  const normalized = normalizeReason(input.reason);
  const mapped = mapStatusAndReason(input.status, normalized);

  return createAppError({
    ...mapped,
    stage: input.stage,
    diagnosticId: input.diagnosticId,
    httpStatus: input.status,
    upstreamReason: normalized,
    safeContext: input.safeContext,
  });
}

export function isAutomaticRetryStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function isTransientCollectionError(error: AppError): boolean {
  return error.code === 'RATE_LIMITED' || error.code === 'YOUTUBE_UNAVAILABLE' || error.code === 'REQUEST_TIMEOUT' || error.code === 'NETWORK_ERROR';
}

function normalizeReason(reason: string | undefined): string | undefined {
  return typeof reason === 'string' && reason.length > 0 ? reason : undefined;
}

function mapStatusAndReason(
  status: number,
  reason: string | undefined,
): Pick<AppErrorInput, 'code' | 'kind' | 'retryable'> {
  if (status === 400) {
    if (reason === 'processingFailure') {
      return { code: 'UPSTREAM_PROCESSING_FAILURE', kind: 'upstream', retryable: true };
    }

    return { code: 'INVALID_API_REQUEST', kind: 'upstream', retryable: false };
  }

  if (status === 401) {
    return { code: 'API_KEY_INVALID', kind: 'configuration', retryable: false };
  }

  if (status === 403) {
    if (reason === 'commentsDisabled') {
      return { code: 'COMMENTS_DISABLED', kind: 'permission', retryable: false };
    }
    if (reason === 'quotaExceeded') {
      return { code: 'QUOTA_EXCEEDED', kind: 'quota', retryable: false };
    }
    if (reason === 'keyInvalid') {
      return { code: 'API_KEY_INVALID', kind: 'configuration', retryable: false };
    }
    if (reason === 'ipRefererBlocked' || reason === 'refererNotAllowedMapError') {
      return { code: 'API_KEY_RESTRICTED', kind: 'configuration', retryable: false };
    }

    return { code: 'API_FORBIDDEN', kind: 'permission', retryable: false };
  }

  if (status === 404) {
    return { code: 'VIDEO_NOT_FOUND', kind: 'upstream', retryable: false };
  }

  if (status === 429) {
    return { code: 'RATE_LIMITED', kind: 'quota', retryable: true };
  }

  if (status >= 500 && status <= 599) {
    return { code: 'YOUTUBE_UNAVAILABLE', kind: 'upstream', retryable: true };
  }

  return { code: 'UNKNOWN_ERROR', kind: 'upstream', retryable: false };
}
