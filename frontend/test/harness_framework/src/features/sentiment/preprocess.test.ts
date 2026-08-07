import { describe, expect, it } from 'vitest';

import type { RawComment } from '../../types/domain';
import { preprocessComment, preprocessComments } from './preprocess';
import { preprocessingFixtures } from './preprocess.fixtures';

const raw = (id: string, text: string, likeCount = 0): RawComment => ({
  id,
  text,
  likeCount,
  publishedAt: '2026-08-07T00:00:00Z',
});

describe('preprocessComment', () => {
  it('keeps display text separate from deterministic normalized analysis text', () => {
    const result = preprocessComment(raw('c1', '  ＡＢＣ&nbsp;좋아요!!!\u200B  https://example.com?a=1  '));

    expect(result.displayText).toBe('ＡＢＣ&nbsp;좋아요!!!\u200B  https://example.com?a=1');
    expect(result.normalizedText).toBe('ABC 좋아요!! <URL>');
    expect(result.language).toBe('mixed');
    expect(result.normalizedHash).toMatch(/^[0-9a-f]{8}$/);
    expect(result.excludedReason).toBeUndefined();
  });

  it.each(preprocessingFixtures.languageCases)('detects $name as $language', ({ text, language }) => {
    expect(preprocessComment(raw('language', text)).language).toBe(language);
  });

  it.each(preprocessingFixtures.placeholderCases)('normalizes $name to placeholders', ({ text, normalizedText }) => {
    expect(preprocessComment(raw('placeholder', text)).normalizedText).toBe(normalizedText);
  });

  it.each(preprocessingFixtures.excludedSingleCases)('excludes $name as $excludedReason', ({ text, excludedReason }) => {
    const result = preprocessComment(raw('excluded', text));

    expect(result.excludedReason).toBe(excludedReason);
  });

  it('preserves emoji-only comments when a supported sentiment emoji is present', () => {
    const result = preprocessComment(raw('emoji', '😍😍😍😍'));

    expect(result.normalizedText).toBe('😍😍😍');
    expect(result.language).toBe('unknown');
    expect(result.excludedReason).toBeUndefined();
  });
});

describe('preprocessComments', () => {
  it('deduplicates by normalized hash and keeps the highest-like representative', () => {
    const result = preprocessComments([
      raw('low-like', 'Great video!!!', 1),
      raw('high-like', 'great video!!', 12),
      raw('other', '편집이 좋아요', 3),
    ]);

    expect(result.comments.map((comment) => comment.id)).toEqual(['high-like', 'other']);
    expect(result.excludedCounts.duplicate).toBe(1);
    expect(result.collectedCount).toBe(3);
    expect(result.sampleSize).toBe(2);
  });

  it('counts spam, unsupported language, short text, and non-analyzable exclusions', () => {
    const result = preprocessComments(preprocessingFixtures.batch);

    expect(result.comments.map((comment) => comment.id)).toEqual(['ko', 'en', 'emoji']);
    expect(result.excludedCounts).toEqual({
      duplicate: 1,
      spam: 2,
      'too-short': 1,
      'unsupported-language': 2,
      'no-analyzable-text': 2,
    });
    expect(result.sampleSize).toBe(3);
    expect(result.collectedCount).toBe(11);
  });
});
