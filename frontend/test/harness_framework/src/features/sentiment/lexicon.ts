export interface LexiconEntry {
  term: string;
  score: number;
}

export const POSITIVE_LEXICON: LexiconEntry[] = [
  { term: '도움', score: 1.1 },
  { term: '도움이', score: 1.1 },
  { term: '좋', score: 1 },
  { term: '좋은', score: 1 },
  { term: '좋고', score: 1 },
  { term: '좋아요', score: 1 },
  { term: '최고', score: 1.25 },
  { term: '깔끔', score: 1 },
  { term: '유익', score: 1.15 },
  { term: '재밌', score: 0.9 },
  { term: '볼만', score: 0.55 },
  { term: '명확', score: 0.85 },
  { term: 'helpful', score: 1.1 },
  { term: 'clear', score: 0.95 },
  { term: 'great', score: 1.1 },
  { term: 'excellent', score: 1.25 },
  { term: 'love', score: 1.1 },
  { term: 'loved', score: 1.1 },
  { term: 'amazing', score: 1.25 },
  { term: 'useful', score: 1 },
  { term: 'pretty useful', score: 1.1 },
  { term: 'good', score: 1 },
];

export const NEGATIVE_LEXICON: LexiconEntry[] = [
  { term: '나쁘', score: -1.1 },
  { term: '나빠', score: -1.1 },
  { term: '별로', score: -0.95 },
  { term: '아쉬', score: -0.75 },
  { term: '헷갈', score: -0.9 },
  { term: '지루', score: -1 },
  { term: '느려', score: -0.9 },
  { term: '느렸', score: -0.9 },
  { term: '오류', score: -1 },
  { term: '실망', score: -1.1 },
  { term: 'awful', score: -1.25 },
  { term: 'confusing', score: -0.95 },
  { term: 'slow', score: -0.9 },
  { term: 'boring', score: -1 },
  { term: 'disappointed', score: -1.1 },
  { term: 'mistake', score: -0.95 },
  { term: 'mistakes', score: -0.95 },
  { term: 'terrible', score: -1.2 },
  { term: 'bad', score: -1 },
];

export const INTENSIFIERS = [
  '정말',
  '진짜',
  '너무',
  '완전',
  '많이',
  '매우',
  'really',
  'very',
  'so',
  'too',
  'pretty',
] as const;

export const NEGATIONS = ['안', '못', '않', '아닌', '아니', 'not', 'no', 'never', "don't", 'dont', "didn't", 'didnt'] as const;

export const CONTRAST_CONNECTORS = ['하지만', '그런데', '근데', '는데', '은데', '지만', 'but', 'however', 'though'] as const;

export const PROFANITY_TERMS = ['미쳤', 'damn', 'shit', 'fuck'] as const;

export const POSITIVE_EMOJIS = ['😀', '😃', '😄', '😁', '😊', '😍', '🥰', '👍', '❤', '❤️', '🔥', '😂'] as const;

export const NEGATIVE_EMOJIS = ['😢', '😭', '😡', '👎'] as const;
