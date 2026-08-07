import type { ExcludeReason, RawComment } from '../../types/domain';
import type { PreprocessLanguage } from './preprocess';

export const preprocessingFixtures = {
  languageCases: [
    { name: 'Korean', text: '자막과 설명이 정말 좋아요', language: 'ko' },
    { name: 'English', text: 'The editing is clear and helpful', language: 'en' },
    { name: 'mixed Korean and English', text: '오늘 video editing 좋아요', language: 'mixed' },
    { name: 'unsupported Japanese', text: 'これはとても良い動画です', language: 'unsupported' },
    { name: 'unknown emoji', text: '😍', language: 'unknown' },
  ] satisfies { name: string; text: string; language: PreprocessLanguage }[],
  placeholderCases: [
    {
      name: 'URL, email, mention, and timestamp',
      text: 'Check https://example.com me@example.com @creator 01:23',
      normalizedText: 'Check <URL> <EMAIL> <MENTION> <TIMESTAMP>',
    },
    {
      name: 'HTML entity and repeated letters',
      text: 'Good&nbsp;&amp;&nbsp;sooooo coool!!!!!',
      normalizedText: 'Good & sooo coool!!',
    },
  ],
  excludedSingleCases: [
    { name: 'URL only', text: 'https://example.com/watch?v=1', excludedReason: 'no-analyzable-text' },
    { name: 'timestamp only', text: '12:03', excludedReason: 'no-analyzable-text' },
    { name: 'mention only', text: '@creator', excludedReason: 'no-analyzable-text' },
    { name: 'too short', text: 'ok', excludedReason: 'too-short' },
    { name: 'unsupported language', text: 'これはとても良い動画です', excludedReason: 'unsupported-language' },
    { name: 'repeated spam', text: 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', excludedReason: 'spam' },
  ] satisfies { name: string; text: string; excludedReason: ExcludeReason }[],
  batch: [
    { id: 'ko', text: '설명이 좋아요', likeCount: 1, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'en', text: 'Helpful editing tips', likeCount: 2, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'dup', text: ' helpful editing tips!! ', likeCount: 1, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'emoji', text: '🔥🔥🔥🔥🔥', likeCount: 4, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'url-only', text: 'https://example.com', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'time-only', text: '01:23', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'short', text: '굿', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'unsupported', text: 'これは便利です', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'unknown', text: '12345', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'link-spam', text: 'https://a.test https://b.test https://c.test check this', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
    { id: 'repeat-spam', text: 'loooooooooooooooooooooooooool', likeCount: 0, publishedAt: '2026-08-07T00:00:00Z' },
  ] satisfies RawComment[],
};
