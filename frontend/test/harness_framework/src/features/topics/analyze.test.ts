import { describe, expect, it } from 'vitest';

import type { FeedbackTopic, TopicIntent } from '../../types/domain';
import { FEEDBACK_TOPICS, TOPIC_INTENTS } from '../../types/domain';
import { analyzeTopics } from './analyze';
import { topicEvaluationFixtures } from './analyze.fixtures';
import { TOPIC_RULESET_VERSION } from './rules';

describe('analyzeTopics', () => {
  it.each(topicEvaluationFixtures)('classifies $name', ({ text, language, expectedTopics, rejectedTopics, expectedIntents }) => {
    const result = analyzeTopics({ normalizedText: text, language });

    expect(result.ruleSetVersion).toBe(TOPIC_RULESET_VERSION);
    expect(result.topics).toEqual(expect.arrayContaining(expectedTopics));
    for (const topic of rejectedTopics ?? []) {
      expect(result.topics).not.toContain(topic);
    }
    expect(result.intents).toEqual(expect.arrayContaining(expectedIntents ?? []));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('supports multiple topics and intents in one comment', () => {
    const result = analyzeTopics({
      normalizedText: '음질은 너무 작고 자막 싱크도 안 맞아요. 다음 편에서는 편집 팁도 알려 주세요?',
      language: 'ko',
    });

    expect(result.topics).toEqual(expect.arrayContaining(['audio', 'captions', 'follow-up', 'editing']));
    expect(result.intents).toEqual(expect.arrayContaining(['complaint', 'request', 'question']));
  });

  it('keeps topic and intent as separate labels', () => {
    const result = analyzeTopics({ normalizedText: '음질이 좋아요', language: 'ko' });

    expect(result.topics).toEqual(['audio']);
    expect(result.intents).toEqual(['praise']);
  });

  it('does not create improvement topics from profanity or negative emotion alone', () => {
    const result = analyzeTopics({ normalizedText: 'damn this was terrible and annoying', language: 'en' });

    expect(result.topics).toEqual([]);
    expect(result.intents).toEqual(['complaint']);
  });

  it('returns safety flags that representative comment ranking can use', () => {
    expect(analyzeTopics({ normalizedText: '너는 멍청하고 최악이야', language: 'ko' }).safetyFlags).toContain('personal-attack');
    expect(analyzeTopics({ normalizedText: 'I hate this race and they should disappear', language: 'en' }).safetyFlags).toContain(
      'hate-or-harassment',
    );
    expect(analyzeTopics({ normalizedText: 'My phone number is 010-1234-5678 please call me', language: 'en' }).safetyFlags).toContain(
      'sensitive-info',
    );
  });

  it('returns only versioned domain topics and intents', () => {
    const result = analyzeTopics({
      normalizedText: 'Great editing, clear delivery, and please add captions next time',
      language: 'en',
    });

    expect(result.topics.every((topic): topic is FeedbackTopic => FEEDBACK_TOPICS.includes(topic))).toBe(true);
    expect(result.intents.every((intent): intent is TopicIntent => TOPIC_INTENTS.includes(intent))).toBe(true);
  });
});
