import type { Sentiment } from '../../types/domain';
import type { PreprocessLanguage } from './preprocess';

export interface SentimentFixture {
  name: string;
  text: string;
  language: PreprocessLanguage;
  expected: Sentiment;
}

export const sentimentEvaluationFixtures = [
  { name: 'ko clear praise', text: '설명이 정말 좋고 도움이 많이 됐어요', language: 'ko', expected: 'positive' },
  { name: 'ko editing praise', text: '편집이 깔끔하고 자막도 최고예요', language: 'ko', expected: 'positive' },
  { name: 'ko emoji praise', text: '오늘 영상 완전 유익해요 😊', language: 'ko', expected: 'positive' },
  { name: 'en clear praise', text: 'This was really helpful and clear', language: 'en', expected: 'positive' },
  { name: 'en production praise', text: 'Great editing, excellent sound, loved it', language: 'en', expected: 'positive' },
  { name: 'en emoji praise', text: 'Amazing tutorial 🔥', language: 'en', expected: 'positive' },
  { name: 'emoji only positive', text: '😍😍👍', language: 'unknown', expected: 'positive' },

  { name: 'ko clear complaint', text: '음질이 너무 나쁘고 설명이 헷갈려요', language: 'ko', expected: 'negative' },
  { name: 'ko pacing complaint', text: '영상이 지루하고 속도가 너무 느려요', language: 'ko', expected: 'negative' },
  { name: 'ko disappointed', text: '이번 편은 별로였고 오류가 많아요', language: 'ko', expected: 'negative' },
  { name: 'en clear complaint', text: 'The audio is awful and confusing', language: 'en', expected: 'negative' },
  { name: 'en pacing complaint', text: 'Too slow and boring this time', language: 'en', expected: 'negative' },
  { name: 'en disappointed', text: 'I am disappointed, there are many mistakes', language: 'en', expected: 'negative' },
  { name: 'emoji only negative', text: '😡👎', language: 'unknown', expected: 'negative' },

  { name: 'ko neutral question', text: '다음 영상은 언제 올라오나요?', language: 'ko', expected: 'neutral' },
  { name: 'ko neutral timestamp', text: '<TIMESTAMP> 부분 다시 봤어요', language: 'ko', expected: 'neutral' },
  { name: 'ko balanced mixed', text: '내용은 좋은데 음질은 아쉬워요', language: 'ko', expected: 'neutral' },
  { name: 'en neutral question', text: 'Can you cover subtitles next week?', language: 'en', expected: 'neutral' },
  { name: 'en neutral factual', text: 'I watched this after the previous episode', language: 'en', expected: 'neutral' },
  { name: 'en balanced mixed', text: 'Good topic but the audio was bad', language: 'en', expected: 'neutral' },

  { name: 'ko negated positive', text: '설명이 좋지 않아서 아쉬웠어요', language: 'ko', expected: 'negative' },
  { name: 'ko negated negative', text: '생각보다 나쁘지 않고 볼만했어요', language: 'ko', expected: 'positive' },
  { name: 'en negated positive', text: 'The editing is not good today', language: 'en', expected: 'negative' },
  { name: 'en negated negative', text: 'Not bad, actually pretty useful', language: 'en', expected: 'positive' },
  { name: 'ko contrast after wins', text: '초반은 느렸지만 뒤로 갈수록 유익했어요', language: 'ko', expected: 'positive' },
  { name: 'en contrast after wins', text: 'The intro was boring but the examples were excellent', language: 'en', expected: 'positive' },
  { name: 'ko profanity alone neutral', text: '와 진짜 미쳤다 ㅋㅋ', language: 'ko', expected: 'neutral' },
  { name: 'en profanity alone neutral', text: 'damn this is wild lol', language: 'en', expected: 'neutral' },
] satisfies SentimentFixture[];
