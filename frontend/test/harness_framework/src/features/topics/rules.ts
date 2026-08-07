import type { CommentSafetyFlag, FeedbackTopic, TopicIntent } from '../../types/domain';

export const TOPIC_RULESET_VERSION = 'comment-lens-topics@0.1.0';

export interface TopicRule {
  topic: FeedbackTopic;
  strongPhrases: readonly string[];
  subjectTerms: readonly string[];
  qualifierTerms: readonly string[];
}

export interface IntentRule {
  intent: TopicIntent;
  terms: readonly string[];
}

export interface SafetyRule {
  flag: CommentSafetyFlag;
  terms: readonly string[];
}

export const TOPIC_RULES: readonly TopicRule[] = [
  {
    topic: 'content',
    strongPhrases: ['자료 조사', '내용이 유익', 'topic depth', 'examples are too shallow'],
    subjectTerms: ['내용', '자료', '예시', '주제', 'topic', 'example', 'examples', 'research'],
    qualifierTerms: ['유익', '깊', '얕', '부족', 'interesting', 'useful', 'helpful', 'shallow', 'thin'],
  },
  {
    topic: 'delivery',
    strongPhrases: ['이해하기 쉬', '전달력이 좋', 'hard to follow', 'clear explanation'],
    subjectTerms: ['설명', '전달', '말투', '목소리', 'explanation', 'delivery', 'walkthrough'],
    qualifierTerms: ['쉬', '차분', '헷갈', '어렵', 'clear', 'confusing', 'follow', 'understand'],
  },
  {
    topic: 'editing',
    strongPhrases: ['컷 편집', '화면 전환', '편집 팁', 'choppy cuts', 'smooth cuts'],
    subjectTerms: ['편집', '컷', '전환', 'editing', 'cuts', 'transition', 'transitions'],
    qualifierTerms: ['깔끔', '산만', '어색', '좋', '팁', 'choppy', 'smooth', 'distracting', 'clean'],
  },
  {
    topic: 'audio',
    strongPhrases: ['음질', '마이크 소리', '배경음악', 'background music', 'microphone volume', 'sound quality'],
    subjectTerms: ['음질', '마이크', '소리', '볼륨', 'audio', 'microphone', 'volume', 'music'],
    qualifierTerms: ['작', '크', '좋', '나쁘', '시끄', 'low', 'loud', 'clear', 'bad', 'awful'],
  },
  {
    topic: 'pace',
    strongPhrases: ['전개 속도', '영상 길이', 'pacing was', 'video length'],
    subjectTerms: ['속도', '전개', '길이', '템포', 'pace', 'pacing', 'length', 'intro'],
    qualifierTerms: ['느리', '빠르', '지루', '적당', '길', 'slow', 'fast', 'boring', 'perfect', 'right'],
  },
  {
    topic: 'captions',
    strongPhrases: ['자막 싱크', '영어 자막', 'subtitles are', 'caption sync'],
    subjectTerms: ['자막', '캡션', 'subtitle', 'subtitles', 'caption', 'captions'],
    qualifierTerms: ['추가', '싱크', '안 맞', '읽기', '오타', 'add', 'sync', 'read', 'readable', 'typo'],
  },
  {
    topic: 'correction',
    strongPhrases: ['계산 오류', '오류를 정정', '정보가 틀', 'correct the typo', 'factual error'],
    subjectTerms: ['오류', '정정', '수정', '계산', '오타', 'error', 'mistake', 'typo', 'correction'],
    qualifierTerms: ['틀', '잘못', '해야', '고쳐', 'correct', 'fix', 'wrong', 'incorrect'],
  },
  {
    topic: 'follow-up',
    strongPhrases: ['다음 편', '후속 영상', 'follow-up video', 'next episode'],
    subjectTerms: ['다음', '후속', '시리즈', '사례', 'follow-up', 'next', 'episode', 'series'],
    qualifierTerms: ['다뤄', '알려', '만들', '보고 싶', 'cover', 'make', 'show', 'explain'],
  },
] as const;

export const INTENT_RULES: readonly IntentRule[] = [
  {
    intent: 'praise',
    terms: ['좋', '유익', '최고', '깔끔', '쉬워', '도움', 'great', 'helpful', 'clear', 'perfect', 'love', 'loved', 'useful'],
  },
  {
    intent: 'complaint',
    terms: [
      '아쉬',
      '나쁘',
      '별로',
      '헷갈',
      '지루',
      '안 맞',
      '오류',
      '짜증',
      'too',
      'bad',
      'awful',
      'confusing',
      'hard',
      'low',
      'loud',
      'shallow',
      'choppy',
      'distracting',
      'terrible',
      'annoying',
      'out of sync',
    ],
  },
  {
    intent: 'question',
    terms: ['?', '언제', '인가요', '있나요', 'can you', 'could you', 'would you', 'what about', 'when'],
  },
  {
    intent: 'request',
    terms: ['주세요', '주실 수', '부탁', '추가', '다뤄', '알려', '정정해야', 'please', 'can you', 'could you', 'add', 'make', 'cover', 'correct', 'fix'],
  },
] as const;

export const PERSONAL_ATTACK_TERMS = ['멍청', '바보', '한심', 'idiot', 'stupid', 'dumb', 'moron'] as const;

export const SAFETY_RULES: readonly SafetyRule[] = [
  {
    flag: 'personal-attack',
    terms: PERSONAL_ATTACK_TERMS,
  },
  {
    flag: 'hate-or-harassment',
    terms: ['인종', '장애인', '성별', '국적', '종교', 'race', 'religion', 'gender', 'nationality', 'disappear'],
  },
  {
    flag: 'sensitive-info',
    terms: ['<EMAIL>', '주민등록번호', '전화번호', 'phone number', 'ssn', 'address'],
  },
] as const;
