import type { Sentiment } from '../../types/domain';

const SENTIMENT_ORDER: Sentiment[] = ['positive', 'neutral', 'negative'];

export function calculateLargestRemainderPercentages(
  counts: Record<Sentiment, number>,
): Record<Sentiment, number> {
  const total = SENTIMENT_ORDER.reduce((sum, sentiment) => sum + counts[sentiment], 0);
  if (total === 0) {
    return { positive: 0, neutral: 0, negative: 0 };
  }

  const quotas = SENTIMENT_ORDER.map((sentiment, index) => {
    const exact = (counts[sentiment] / total) * 100;
    return {
      sentiment,
      index,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const remaining = 100 - quotas.reduce((sum, quota) => sum + quota.floor, 0);
  const winners = new Set(
    [...quotas]
      .sort((left, right) => right.remainder - left.remainder || right.floor - left.floor || left.index - right.index)
      .slice(0, remaining)
      .map((quota) => quota.sentiment),
  );

  return Object.fromEntries(
    quotas.map((quota) => [quota.sentiment, quota.floor + (winners.has(quota.sentiment) ? 1 : 0)]),
  ) as Record<Sentiment, number>;
}
