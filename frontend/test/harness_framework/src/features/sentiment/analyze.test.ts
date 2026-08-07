import { describe, expect, it } from 'vitest';

import { SENTIMENT_ANALYSIS } from '../../config/analysis';
import type { Sentiment } from '../../types/domain';
import { analyzeSentiment } from './analyze';
import { sentimentEvaluationFixtures } from './analyze.fixtures';

describe('analyzeSentiment', () => {
  it.each(sentimentEvaluationFixtures)('classifies $name as $expected', ({ text, language, expected }) => {
    const result = analyzeSentiment({ normalizedText: text, language });

    expect(result.label).toBe(expected);
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns deterministic rule hits without exposing confidence as probability', () => {
    const first = analyzeSentiment({ normalizedText: '편집은 정말 좋은데 음질은 너무 나빠요', language: 'ko' });
    const second = analyzeSentiment({ normalizedText: '편집은 정말 좋은데 음질은 너무 나빠요', language: 'ko' });

    expect(first).toEqual(second);
    expect(first.ruleHits).toEqual(
      expect.arrayContaining(['intensifier:정말', 'positive:좋은', 'contrast:은데', 'intensifier:너무', 'negative:나빠']),
    );
  });

  it('keeps low-evidence and close mixed scores neutral', () => {
    expect(analyzeSentiment({ normalizedText: '볼만한 부분도 있고 아쉬운 부분도 있어요', language: 'ko' }).label).toBe('neutral');
    expect(analyzeSentiment({ normalizedText: 'good idea but bad audio', language: 'en' }).label).toBe('neutral');
    expect(SENTIMENT_ANALYSIS.minimumScoreDifference).toBeGreaterThan(0);
  });

  it('tracks negation, emoji, and profanity rules separately', () => {
    const negated = analyzeSentiment({ normalizedText: 'not terrible 👍', language: 'en' });
    const profanityOnly = analyzeSentiment({ normalizedText: 'damn lol', language: 'en' });

    expect(negated.label).toBe('positive');
    expect(negated.ruleHits).toEqual(expect.arrayContaining(['negation:not', 'negative:terrible', 'emoji-positive:👍']));
    expect(profanityOnly.label).toBe('neutral');
    expect(profanityOnly.ruleHits).toEqual(['profanity:damn']);
  });

  it('meets the fixed evaluation macro-F1 gate', () => {
    const report = evaluateFixtures();

    expect(report.macroF1).toBeGreaterThanOrEqual(0.7);
    expect(report.byLabel.positive.total).toBeGreaterThan(0);
    expect(report.byLabel.neutral.total).toBeGreaterThan(0);
    expect(report.byLabel.negative.total).toBeGreaterThan(0);
  });
});

function evaluateFixtures(): {
  macroF1: number;
  byLabel: Record<Sentiment, { total: number; truePositive: number; precision: number; recall: number; f1: number }>;
} {
  const labels: Sentiment[] = ['positive', 'neutral', 'negative'];
  const predictions = sentimentEvaluationFixtures.map((fixture) => ({
    expected: fixture.expected,
    actual: analyzeSentiment({ normalizedText: fixture.text, language: fixture.language }).label,
  }));

  const byLabel = Object.fromEntries(
    labels.map((label) => {
      const truePositive = predictions.filter((prediction) => prediction.expected === label && prediction.actual === label).length;
      const falsePositive = predictions.filter((prediction) => prediction.expected !== label && prediction.actual === label).length;
      const falseNegative = predictions.filter((prediction) => prediction.expected === label && prediction.actual !== label).length;
      const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
      const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
      const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

      return [label, { total: truePositive + falseNegative, truePositive, precision, recall, f1 }];
    }),
  ) as Record<Sentiment, { total: number; truePositive: number; precision: number; recall: number; f1: number }>;

  return {
    macroF1: labels.reduce((sum, label) => sum + byLabel[label].f1, 0) / labels.length,
    byLabel,
  };
}
