import type { FeedbackTopic, TopicIntent } from '../../types/domain';
import type { PreprocessLanguage } from '../sentiment/preprocess';

export interface TopicFixture {
  name: string;
  text: string;
  language: PreprocessLanguage;
  expectedTopics: FeedbackTopic[];
  rejectedTopics?: FeedbackTopic[];
  expectedIntents?: TopicIntent[];
}

export const topicEvaluationFixtures = [
  {
    name: 'ko content praise',
    text: '자료 조사와 예시가 깊어서 내용이 정말 유익해요',
    language: 'ko',
    expectedTopics: ['content'],
    expectedIntents: ['praise'],
  },
  {
    name: 'en content complaint',
    text: 'The topic is interesting but the examples are too shallow',
    language: 'en',
    expectedTopics: ['content'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'ko delivery praise',
    text: '설명이 차분하고 이해하기 쉬워서 전달력이 좋아요',
    language: 'ko',
    expectedTopics: ['delivery'],
    expectedIntents: ['praise'],
  },
  {
    name: 'en delivery complaint',
    text: 'The explanation was confusing and hard to follow',
    language: 'en',
    expectedTopics: ['delivery'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'ko editing praise',
    text: '컷 편집과 화면 전환이 깔끔해서 보기 편했어요',
    language: 'ko',
    expectedTopics: ['editing'],
    expectedIntents: ['praise'],
  },
  {
    name: 'en editing complaint',
    text: 'The cuts feel choppy and the transitions are distracting',
    language: 'en',
    expectedTopics: ['editing'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'ko audio praise',
    text: '마이크 소리와 배경음악 밸런스가 좋아요',
    language: 'ko',
    expectedTopics: ['audio'],
    expectedIntents: ['praise'],
  },
  {
    name: 'en audio complaint',
    text: 'The microphone volume is low and the background music is too loud',
    language: 'en',
    expectedTopics: ['audio'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'ko pace complaint',
    text: '초반 전개 속도가 너무 느려서 지루했어요',
    language: 'ko',
    expectedTopics: ['pace'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'en pace praise',
    text: 'The pacing was perfect and the video length felt right',
    language: 'en',
    expectedTopics: ['pace'],
    expectedIntents: ['praise'],
  },
  {
    name: 'ko captions request',
    text: '영어 자막도 추가해 주세요',
    language: 'ko',
    expectedTopics: ['captions'],
    expectedIntents: ['request'],
  },
  {
    name: 'en captions complaint',
    text: 'The subtitles are out of sync and hard to read',
    language: 'en',
    expectedTopics: ['captions'],
    expectedIntents: ['complaint'],
  },
  {
    name: 'ko correction complaint',
    text: '3분 12초에 나온 계산 오류를 정정해야 할 것 같아요',
    language: 'ko',
    expectedTopics: ['correction'],
    expectedIntents: ['complaint', 'request'],
  },
  {
    name: 'en correction request',
    text: 'Please correct the typo in the chart at 4:20',
    language: 'en',
    expectedTopics: ['correction'],
    expectedIntents: ['request'],
  },
  {
    name: 'ko follow-up question',
    text: '다음 편에서 실제 적용 사례도 다뤄 주실 수 있나요?',
    language: 'ko',
    expectedTopics: ['follow-up'],
    expectedIntents: ['question', 'request'],
  },
  {
    name: 'en follow-up request',
    text: 'Can you make a follow-up video about beginner mistakes?',
    language: 'en',
    expectedTopics: ['follow-up'],
    expectedIntents: ['question', 'request'],
  },
  {
    name: 'ko negative profanity without topic evidence',
    text: '와 진짜 짜증나고 별로다',
    language: 'ko',
    expectedTopics: [],
    expectedIntents: ['complaint'],
  },
  {
    name: 'en keyword alone does not infer audio',
    text: 'This sounds interesting overall',
    language: 'en',
    expectedTopics: [],
    rejectedTopics: ['audio'],
  },
] satisfies TopicFixture[];
