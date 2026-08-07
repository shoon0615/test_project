import { describe, expect, it } from 'vitest';

import { parseYouTubeUrl, type ParsedYouTubeUrl, type UrlParseErrorCode } from './url';

const VIDEO_ID = 'AbC123_xY-z';

function expectParsed(input: string, expected: Partial<ParsedYouTubeUrl> = {}) {
  const result = parseYouTubeUrl(input);

  expect(result).toMatchObject({ ok: true });
  if (!result.ok) {
    throw new Error(`expected URL to parse, received ${result.error.code}`);
  }

  expect(result.value).toMatchObject({
    videoId: VIDEO_ID,
    canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    ...expected,
  });
}

function expectRejected(input: string, code: UrlParseErrorCode) {
  const result = parseYouTubeUrl(input);

  expect(result).toMatchObject({ ok: false, error: { code } });
}

describe('parseYouTubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=AbC123_xY-z', { kind: 'watch', host: 'www.youtube.com' }],
    [' https://youtube.com/watch?v=AbC123_xY-z&t=32s&feature=share ', { kind: 'watch', host: 'youtube.com' }],
    ['https://m.youtube.com/watch?v=AbC123_xY-z&si=tracking', { kind: 'watch', host: 'm.youtube.com' }],
    ['https://music.youtube.com/watch?v=AbC123_xY-z&list=PL123&index=4', { kind: 'watch', host: 'music.youtube.com' }],
    ['https://youtu.be/AbC123_xY-z?si=tracking', { kind: 'short', host: 'youtu.be' }],
    ['https://www.youtube.com/shorts/AbC123_xY-z?feature=share', { kind: 'shorts', host: 'www.youtube.com' }],
    ['https://youtube.com/live/AbC123_xY-z?feature=share', { kind: 'live', host: 'youtube.com' }],
  ] satisfies [string, Partial<ParsedYouTubeUrl>][])('extracts the video ID from %s', (input, expected) => {
    expectParsed(input, expected);
  });

  it('parses only the video when a playlist URL also contains v', () => {
    expectParsed('https://www.youtube.com/watch?list=PL123&index=2&v=AbC123_xY-z', {
      kind: 'watch',
      playlistIgnored: true,
    });
  });

  it.each([
    ['', 'EMPTY_INPUT'],
    ['     ', 'EMPTY_INPUT'],
    [`https://www.youtube.com/watch?v=${'a'.repeat(2049)}`, 'INPUT_TOO_LONG'],
    ['javascript:alert(1)', 'UNSUPPORTED_SCHEME'],
    ['ftp://www.youtube.com/watch?v=AbC123_xY-z', 'UNSUPPORTED_SCHEME'],
    ['https://evil.example/watch?v=AbC123_xY-z', 'UNSUPPORTED_HOST'],
    ['https://youtube.com.evil.example/watch?v=AbC123_xY-z', 'UNSUPPORTED_HOST'],
    ['https://user:pass@www.youtube.com/watch?v=AbC123_xY-z', 'UNSAFE_URL_AUTHORITY'],
    ['https://www.youtube.com:443/watch?v=AbC123_xY-z', 'UNSAFE_URL_AUTHORITY'],
    ['https://studio.youtube.com/video/AbC123_xY-z/edit', 'UNSUPPORTED_HOST'],
    ['https://www.youtube.com/channel/UC12345678901', 'UNSUPPORTED_PATH'],
    ['https://www.youtube.com/results?search_query=AbC123_xY-z', 'UNSUPPORTED_PATH'],
    ['https://www.youtube.com/playlist?list=PL123', 'PLAYLIST_ONLY'],
    ['https://www.youtube.com/watch?list=PL123', 'PLAYLIST_ONLY'],
    ['https://www.youtube.com/watch?v=short', 'INVALID_VIDEO_ID'],
    ['https://www.youtube.com/watch?v=AbC123_xY-zZ', 'INVALID_VIDEO_ID'],
    ['https://www.youtube.com/watch?v=AbC123_xY!*', 'INVALID_VIDEO_ID'],
    ['https://youtu.be/AbC123_xY-z/extra', 'UNSUPPORTED_PATH'],
    ['https://www.youtube.com/shorts/AbC123_xY-z/extra', 'UNSUPPORTED_PATH'],
    ['https://www.youtube.com/redirect?q=https%3A%2F%2Fyoutu.be%2FAbC123_xY-z', 'NESTED_URL'],
    ['https://www.youtube.com/watch?url=https%3A%2F%2Fyoutu.be%2FAbC123_xY-z', 'NESTED_URL'],
    ['https://www.youtube.com/watch?v=https%3A%2F%2Fyoutu.be%2FAbC123_xY-z', 'NESTED_URL'],
  ] satisfies [string, UrlParseErrorCode][])('rejects %s as %s', (input, code) => {
    expectRejected(input, code);
  });

  it('accepts harmless query and fragment variations without changing the canonical URL', () => {
    const queryNames = ['t', 'si', 'feature', 'list', 'index', 'utm_source', 'utm_campaign'];

    for (const queryName of queryNames) {
      expectParsed(`https://www.youtube.com/watch?${queryName}=ignored&v=${VIDEO_ID}#comments`);
    }
  });

  it('rejects malformed or nested URL mutations before path-specific parsing', () => {
    const mutations = [
      `https://www.youtube.com/watch?v=${VIDEO_ID}&next=https://evil.example`,
      `https://youtu.be/${VIDEO_ID}?q=http%3A%2F%2Fevil.example`,
      `https://www.youtube.com/shorts/https%3A%2F%2Fyoutu.be%2F${VIDEO_ID}`,
    ];

    for (const input of mutations) {
      expectRejected(input, 'NESTED_URL');
    }
  });
});
