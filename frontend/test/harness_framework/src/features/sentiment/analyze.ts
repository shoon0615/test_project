import { SENTIMENT_ANALYSIS } from '../../config/analysis';
import type { Sentiment } from '../../types/domain';
import type { PreprocessLanguage } from './preprocess';
import {
  CONTRAST_CONNECTORS,
  INTENSIFIERS,
  NEGATIONS,
  NEGATIVE_EMOJIS,
  NEGATIVE_LEXICON,
  POSITIVE_EMOJIS,
  POSITIVE_LEXICON,
  PROFANITY_TERMS,
  type LexiconEntry,
} from './lexicon';

export interface SentimentInput {
  normalizedText: string;
  language: PreprocessLanguage;
}

export interface SentimentAnalysisResult {
  label: Sentiment;
  score: number;
  confidence: number;
  ruleHits: string[];
}

interface ScoredHit {
  index: number;
  term: string;
  baseScore: number;
  score: number;
  kind: 'positive' | 'negative' | 'emoji-positive' | 'emoji-negative';
}

export function analyzeSentiment(input: SentimentInput): SentimentAnalysisResult {
  const normalizedText = input.normalizedText.trim();
  if (!normalizedText) {
    return { label: 'neutral', score: 0, confidence: 0, ruleHits: [] };
  }

  const searchableText = normalizedText.toLocaleLowerCase('en-US');
  const contrastIndex = findFirstTermIndex(searchableText, CONTRAST_CONNECTORS);
  const ruleHits: string[] = [];
  const scoredHits = [
    ...collectLexiconHits(searchableText, POSITIVE_LEXICON, 'positive'),
    ...collectLexiconHits(searchableText, NEGATIVE_LEXICON, 'negative'),
    ...collectEmojiHits(normalizedText),
  ].sort((left, right) => left.index - right.index || Math.abs(right.baseScore) - Math.abs(left.baseScore));

  for (const profanity of PROFANITY_TERMS) {
    if (searchableText.includes(profanity)) {
      ruleHits.push(`profanity:${profanity}`);
    }
  }

  const filteredHits = removeNestedPhraseHits(scoredHits);
  for (const hit of filteredHits) {
    const negation = hit.kind.startsWith('emoji') ? undefined : findNegation(searchableText, hit);
    const intensifier = findIntensifierBefore(searchableText, hit.index);
    let adjustedScore = hit.score;

    if (negation) {
      adjustedScore *= -0.85;
      ruleHits.push(`negation:${negation}`);
    }

    if (intensifier) {
      adjustedScore *= 1.25;
      ruleHits.push(`intensifier:${intensifier}`);
    }

    if (contrastIndex >= 0) {
      adjustedScore *= hit.index < contrastIndex ? SENTIMENT_ANALYSIS.contrastBeforeWeight : SENTIMENT_ANALYSIS.contrastAfterWeight;
    }

    ruleHits.push(`${hit.kind}:${hit.term}`);
    hit.score = adjustedScore;
  }

  if (contrastIndex >= 0) {
    const connector = CONTRAST_CONNECTORS.find((term) => searchableText.includes(term));
    if (connector) {
      ruleHits.push(`contrast:${connector}`);
    }
  }

  const positiveScore = filteredHits.filter((hit) => hit.score > 0).reduce((sum, hit) => sum + hit.score, 0);
  const negativeScore = Math.abs(filteredHits.filter((hit) => hit.score < 0).reduce((sum, hit) => sum + hit.score, 0));
  const signedScore = positiveScore - negativeScore;
  const normalizedScore = clamp(signedScore / 4, -1, 1);
  const difference = Math.abs(positiveScore - negativeScore);
  const hasMinimumEvidence = Math.abs(normalizedScore) >= SENTIMENT_ANALYSIS.minimumAbsoluteScore;
  const isMixedClose = positiveScore > 0 && negativeScore > 0 && difference < SENTIMENT_ANALYSIS.minimumScoreDifference;
  const label = !hasMinimumEvidence || isMixedClose ? 'neutral' : normalizedScore > 0 ? 'positive' : 'negative';
  const confidence =
    label === 'neutral'
      ? clamp((positiveScore + negativeScore) / (SENTIMENT_ANALYSIS.maxConfidenceEvidence * 2), 0, 0.65)
      : clamp((difference + filteredHits.length * 0.2) / SENTIMENT_ANALYSIS.maxConfidenceEvidence, 0.15, 1);

  return {
    label,
    score: round(normalizedScore),
    confidence: round(confidence),
    ruleHits: unique(ruleHits),
  };
}

function collectLexiconHits(
  text: string,
  lexicon: LexiconEntry[],
  kind: 'positive' | 'negative',
): ScoredHit[] {
  return lexicon.flatMap((entry) => {
    const indexes = findAllTermIndexes(text, entry.term);

    return indexes.map((index) => ({
      index,
      term: entry.term,
      baseScore: entry.score,
      score: entry.score,
      kind,
    }));
  });
}

function collectEmojiHits(text: string): ScoredHit[] {
  const hits: ScoredHit[] = [];

  for (const emoji of POSITIVE_EMOJIS) {
    for (const index of findAllTermIndexes(text, emoji)) {
      hits.push({ index, term: emoji, baseScore: 0.75, score: 0.75, kind: 'emoji-positive' });
    }
  }

  for (const emoji of NEGATIVE_EMOJIS) {
    for (const index of findAllTermIndexes(text, emoji)) {
      hits.push({ index, term: emoji, baseScore: -0.85, score: -0.85, kind: 'emoji-negative' });
    }
  }

  return hits;
}

function removeNestedPhraseHits(hits: ScoredHit[]): ScoredHit[] {
  return hits.filter((hit, index) => {
    const hitEnd = hit.index + hit.term.length;

    return !hits.some((other, otherIndex) => {
      if (otherIndex === index || other.term.length <= hit.term.length) {
        return false;
      }

      const otherEnd = other.index + other.term.length;
      return hit.index >= other.index && hitEnd <= otherEnd;
    });
  });
}

function findNegation(text: string, hit: ScoredHit): string | undefined {
  return findNegationBefore(text, hit.index) ?? findNegationAfter(text, hit);
}

function findNegationBefore(text: string, index: number): string | undefined {
  const rawPrefix = text.slice(Math.max(0, index - 32), index);
  const prefix = rawPrefix.slice(Math.max(rawPrefix.lastIndexOf(','), rawPrefix.lastIndexOf('.'), rawPrefix.lastIndexOf('!'), rawPrefix.lastIndexOf('?')) + 1);
  const tokens = prefix.split(/[\s,.!?]+/u).filter(Boolean).slice(-SENTIMENT_ANALYSIS.negationWindow);

  return [...NEGATIONS].find((term) => tokens.some((token) => token === term || token.endsWith(term)));
}

function findNegationAfter(text: string, hit: ScoredHit): string | undefined {
  const suffix = text.slice(hit.index + hit.term.length, hit.index + hit.term.length + 8);
  if (/^지\s*않/u.test(suffix) || /^지\s*아니/u.test(suffix)) {
    return '않';
  }

  return undefined;
}

function findIntensifierBefore(text: string, index: number): string | undefined {
  const prefix = text.slice(Math.max(0, index - 24), index);

  return [...INTENSIFIERS]
    .map((term) => ({ term, index: prefix.lastIndexOf(term) }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => right.index - left.index)[0]?.term;
}

function findFirstTermIndex(text: string, terms: readonly string[]): number {
  return terms.reduce((firstIndex, term) => {
    const index = text.indexOf(term);
    if (index < 0) {
      return firstIndex;
    }

    return firstIndex < 0 ? index : Math.min(firstIndex, index);
  }, -1);
}

function findAllTermIndexes(text: string, term: string): number[] {
  const indexes: number[] = [];
  let index = text.indexOf(term);

  while (index >= 0) {
    if (hasTermBoundary(text, term, index)) {
      indexes.push(index);
    }
    index = text.indexOf(term, index + Math.max(1, term.length));
  }

  return indexes;
}

function hasTermBoundary(text: string, term: string, index: number): boolean {
  if (containsHangul(term) || containsEmoji(term)) {
    return true;
  }

  const before = index === 0 ? '' : (text[index - 1] ?? '');
  const after = index + term.length >= text.length ? '' : (text[index + term.length] ?? '');

  return !isAsciiWord(before) && !isAsciiWord(after);
}

function containsHangul(value: string): boolean {
  return /\p{Script=Hangul}/u.test(value);
}

function containsEmoji(value: string): boolean {
  return /\p{Emoji_Presentation}|\ufe0f/u.test(value);
}

function isAsciiWord(value: string): boolean {
  return /^[a-z0-9_]$/iu.test(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
