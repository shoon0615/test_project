export type Result<TValue, TError> = { ok: true; value: TValue } | { ok: false; error: TError };

export type YouTubeUrlKind = 'watch' | 'short' | 'shorts' | 'live';

export interface ParsedYouTubeUrl {
  videoId: string;
  canonicalUrl: string;
  host: string;
  kind: YouTubeUrlKind;
  playlistIgnored: boolean;
}

export const URL_PARSE_ERROR_CODES = [
  'EMPTY_INPUT',
  'INPUT_TOO_LONG',
  'INVALID_URL',
  'UNSUPPORTED_SCHEME',
  'UNSUPPORTED_HOST',
  'UNSAFE_URL_AUTHORITY',
  'NESTED_URL',
  'UNSUPPORTED_PATH',
  'PLAYLIST_ONLY',
  'INVALID_VIDEO_ID',
] as const;

export type UrlParseErrorCode = (typeof URL_PARSE_ERROR_CODES)[number];

export interface UrlParseError {
  code: UrlParseErrorCode;
}

const MAX_INPUT_LENGTH = 2_048;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const STANDARD_YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const SHORT_YOUTUBE_HOST = 'youtu.be';
const URL_LIKE_PATTERN = /(?:https?:|javascript:|data:|vbscript:|file:)/i;

export function parseYouTubeUrl(input: string): Result<ParsedYouTubeUrl, UrlParseError> {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return failure('EMPTY_INPUT');
  }

  if (trimmedInput.length > MAX_INPUT_LENGTH) {
    return failure('INPUT_TOO_LONG');
  }

  const url = parseUrl(trimmedInput);
  if (!url) {
    return failure('INVALID_URL');
  }

  if (url.protocol !== 'https:') {
    return failure('UNSUPPORTED_SCHEME');
  }

  if (hasExplicitCredentialOrPort(trimmedInput, url)) {
    return failure('UNSAFE_URL_AUTHORITY');
  }

  const host = url.hostname.toLowerCase();
  if (!isSupportedHost(host)) {
    return failure('UNSUPPORTED_HOST');
  }

  if (containsNestedUrl(url)) {
    return failure('NESTED_URL');
  }

  if (host === SHORT_YOUTUBE_HOST) {
    return parseShortUrl(url, host);
  }

  return parseStandardYouTubeUrl(url, host);
}

function parseUrl(input: string): URL | undefined {
  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

function isSupportedHost(host: string): boolean {
  return host === SHORT_YOUTUBE_HOST || STANDARD_YOUTUBE_HOSTS.has(host);
}

function hasExplicitCredentialOrPort(input: string, url: URL): boolean {
  if (url.username !== '' || url.password !== '') {
    return true;
  }

  const authority = input.slice(url.protocol.length + 2).split(/[/?#]/u, 1)[0] ?? '';

  return /:\d+$/u.test(authority);
}

function containsNestedUrl(url: URL): boolean {
  for (const segment of getPathSegments(url)) {
    if (isUrlLike(decodeSafely(segment))) {
      return true;
    }
  }

  for (const [name, value] of url.searchParams.entries()) {
    if (isUrlLike(name) || isUrlLike(value) || isUrlLike(decodeSafely(value))) {
      return true;
    }
  }

  return false;
}

function isUrlLike(value: string): boolean {
  return URL_LIKE_PATTERN.test(value);
}

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseShortUrl(url: URL, host: string): Result<ParsedYouTubeUrl, UrlParseError> {
  const segments = getPathSegments(url);

  if (segments.length !== 1) {
    return failure('UNSUPPORTED_PATH');
  }

  return buildParsedUrl(segments[0] ?? '', host, 'short', false);
}

function parseStandardYouTubeUrl(url: URL, host: string): Result<ParsedYouTubeUrl, UrlParseError> {
  const segments = getPathSegments(url);
  const [firstSegment, secondSegment] = segments;

  if (firstSegment === 'watch' && segments.length === 1) {
    return parseWatchUrl(url, host);
  }

  if ((firstSegment === 'shorts' || firstSegment === 'live') && segments.length === 2) {
    return buildParsedUrl(secondSegment ?? '', host, firstSegment, false);
  }

  if (firstSegment === 'playlist' || (firstSegment === 'watch' && url.searchParams.has('list'))) {
    return failure('PLAYLIST_ONLY');
  }

  return failure('UNSUPPORTED_PATH');
}

function parseWatchUrl(url: URL, host: string): Result<ParsedYouTubeUrl, UrlParseError> {
  const videoId = url.searchParams.get('v');
  const playlistIgnored = url.searchParams.has('list');

  if (!videoId) {
    return playlistIgnored ? failure('PLAYLIST_ONLY') : failure('INVALID_VIDEO_ID');
  }

  return buildParsedUrl(videoId, host, 'watch', playlistIgnored);
}

function buildParsedUrl(
  videoId: string,
  host: string,
  kind: YouTubeUrlKind,
  playlistIgnored: boolean,
): Result<ParsedYouTubeUrl, UrlParseError> {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    return failure('INVALID_VIDEO_ID');
  }

  return {
    ok: true,
    value: {
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      host,
      kind,
      playlistIgnored,
    },
  };
}

function getPathSegments(url: URL): string[] {
  return url.pathname.split('/').filter((segment) => segment.length > 0);
}

function failure(code: UrlParseErrorCode): Result<never, UrlParseError> {
  return { ok: false, error: { code } };
}
