import { EXCLUDE_REASONS, type ExcludeReason, type RawComment } from '../../types/domain';

export type PreprocessLanguage = 'ko' | 'en' | 'mixed' | 'unknown' | 'unsupported';

export interface PreprocessedComment extends RawComment {
  displayText: string;
  normalizedText: string;
  normalizedHash: string;
  language: PreprocessLanguage;
  excludedReason?: ExcludeReason;
}

export interface PreprocessResult {
  comments: PreprocessedComment[];
  excluded: PreprocessedComment[];
  excludedCounts: Record<ExcludeReason, number>;
  collectedCount: number;
  sampleSize: number;
}

// eslint-disable-next-line no-control-regex
const ZERO_WIDTH_OR_CONTROL_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[A-Z0-9.-]+\.[A-Z]{2,}(?:\/[^\s<>"']*)?/giu;
const MENTION_PATTERN = /(^|[\s([{])@[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,29}\b/gu;
const TIMESTAMP_PATTERN = /\b(?:(?:\d{1,2}:)?\d{1,2}:)?\d{1,2}:\d{2}\b/gu;
const PLACEHOLDER_PATTERN = /<(?:URL|EMAIL|MENTION|TIMESTAMP)>/g;
const SUPPORTED_SENTIMENT_EMOJIS = new Set(['😀', '😃', '😄', '😁', '😊', '😍', '🥰', '👍', '❤', '❤️', '🔥', '😂', '😢', '😭', '😡', '👎']);

export function preprocessComment(comment: RawComment): PreprocessedComment {
  const displayText = comment.text.trim();
  const decodedText = decodeHtmlEntities(displayText.normalize('NFKC')).replace(ZERO_WIDTH_OR_CONTROL_PATTERN, '');
  const hasRepeatedSpam = hasExcessiveRepeatedRun(decodedText);
  const linkCount = countMatches(decodedText, URL_PATTERN);
  const withPlaceholders = replacePlaceholders(decodedText);
  const normalizedText = normalizeRepeatedCharacters(withPlaceholders).replace(/\s+/g, ' ').trim();
  const language = detectLanguage(normalizedText);
  const normalizedHash = hashNormalizedText(normalizedText);
  const excludedReason = getExcludedReason({
    normalizedText,
    language,
    hasRepeatedSpam,
    linkCount,
  });

  return {
    ...comment,
    displayText,
    normalizedText,
    normalizedHash,
    language,
    ...(excludedReason ? { excludedReason } : {}),
  };
}

export function preprocessComments(comments: RawComment[]): PreprocessResult {
  const excludedCounts = zeroExcludedCounts();
  const includedByHash = new Map<string, PreprocessedComment>();
  const excluded: PreprocessedComment[] = [];

  for (const comment of comments) {
    const preprocessed = preprocessComment(comment);

    if (preprocessed.excludedReason) {
      excludedCounts[preprocessed.excludedReason] += 1;
      excluded.push(preprocessed);
      continue;
    }

    const previous = includedByHash.get(preprocessed.normalizedHash);
    if (previous) {
      excludedCounts.duplicate += 1;
      excluded.push({ ...preprocessed, excludedReason: 'duplicate' });
      if (preprocessed.likeCount > previous.likeCount) {
        includedByHash.set(preprocessed.normalizedHash, preprocessed);
      }
      continue;
    }

    includedByHash.set(preprocessed.normalizedHash, preprocessed);
  }

  const included = Array.from(includedByHash.values());

  return {
    comments: included,
    excluded,
    excludedCounts,
    collectedCount: comments.length,
    sampleSize: included.length,
  };
}

function getExcludedReason({
  normalizedText,
  language,
  hasRepeatedSpam,
  linkCount,
}: {
  normalizedText: string;
  language: PreprocessLanguage;
  hasRepeatedSpam: boolean;
  linkCount: number;
}): ExcludeReason | undefined {
  if (isSupportedEmojiOnly(normalizedText)) {
    return undefined;
  }

  if (isPlaceholderOnly(normalizedText)) {
    return 'no-analyzable-text';
  }

  if (hasRepeatedSpam || linkCount >= 3) {
    return 'spam';
  }

  if (language === 'unsupported' || language === 'unknown') {
    return 'unsupported-language';
  }

  if (countAnalyzableLetters(normalizedText) < 3) {
    return 'too-short';
  }

  return undefined;
}

function replacePlaceholders(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '<EMAIL>')
    .replace(URL_PATTERN, '<URL>')
    .replace(MENTION_PATTERN, (_match, prefix: string) => `${prefix}<MENTION>`)
    .replace(TIMESTAMP_PATTERN, '<TIMESTAMP>');
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/giu, (entity, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return decodeCodePoint(Number.parseInt(body.slice(2), 16), entity);
    }

    if (body.startsWith('#')) {
      return decodeCodePoint(Number.parseInt(body.slice(1), 10), entity);
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function decodeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint)) {
    return fallback;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

function normalizeRepeatedCharacters(value: string): string {
  return Array.from(value)
    .reduce<string[]>((characters, character) => {
      const previous = characters.at(-1);
      const beforePrevious = characters.at(-2);
      const thirdPrevious = characters.at(-3);
      const limit = isPunctuation(character) ? 2 : 3;

      if (
        previous === character &&
        beforePrevious === character &&
        (limit === 2 || thirdPrevious === character)
      ) {
        return characters;
      }

      characters.push(character);
      return characters;
    }, [])
    .join('');
}

function detectLanguage(value: string): PreprocessLanguage {
  const text = value.replace(PLACEHOLDER_PATTERN, '').trim();
  const hangulCount = countMatches(text, /\p{Script=Hangul}/gu);
  const latinCount = countMatches(text, /\p{Script=Latin}/gu);
  const unsupportedLetterCount = countUnsupportedLetters(text);

  if (hangulCount > 0 && latinCount > 0) {
    return 'mixed';
  }

  if (hangulCount > 0) {
    return 'ko';
  }

  if (latinCount > 0) {
    return 'en';
  }

  if (unsupportedLetterCount > 0 || /[\u3040-\u30ff\u3400-\u9fff]/u.test(text)) {
    return 'unsupported';
  }

  return 'unknown';
}

function hashNormalizedText(value: string): string {
  let hash = 0x811c9dc5;
  const normalized = value
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{Letter}\p{Number}\p{Emoji_Presentation}<>\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isPlaceholderOnly(value: string): boolean {
  return value.replace(PLACEHOLDER_PATTERN, '').replace(/[^\p{Letter}\p{Number}\p{Emoji_Presentation}]/gu, '').length === 0;
}

function isSupportedEmojiOnly(value: string): boolean {
  const compact = value.replace(/\s+/g, '').replace(/\ufe0f/gu, '');
  if (compact.length === 0) {
    return false;
  }

  return Array.from(compact).every((character) => SUPPORTED_SENTIMENT_EMOJIS.has(character));
}

function hasExcessiveRepeatedRun(value: string): boolean {
  let previous = '';
  let runLength = 0;

  for (const character of Array.from(value)) {
    if (character === previous) {
      runLength += 1;
    } else {
      previous = character;
      runLength = 1;
    }

    if (runLength >= 12) {
      return true;
    }
  }

  return false;
}

function countAnalyzableLetters(value: string): number {
  return countMatches(value.replace(PLACEHOLDER_PATTERN, ''), /[\p{Script=Hangul}\p{Script=Latin}]/gu);
}

function countUnsupportedLetters(value: string): number {
  return Array.from(value).filter(
    (character) =>
      /\p{Letter}/u.test(character) && !/\p{Script=Hangul}/u.test(character) && !/\p{Script=Latin}/u.test(character),
  ).length;
}

function countMatches(value: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return Array.from(value.matchAll(pattern)).length;
}

function isPunctuation(value: string): boolean {
  return /[\p{Punctuation}\p{Symbol}]/u.test(value) && !/\p{Emoji_Presentation}/u.test(value);
}

function zeroExcludedCounts(): Record<ExcludeReason, number> {
  return Object.fromEntries(EXCLUDE_REASONS.map((reason) => [reason, 0])) as Record<ExcludeReason, number>;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};
