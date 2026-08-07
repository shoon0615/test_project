import type { CommentSafetyFlag, FeedbackTopic, TopicIntent } from '../../types/domain';
import type { PreprocessLanguage } from '../sentiment/preprocess';
import {
  INTENT_RULES,
  PERSONAL_ATTACK_TERMS,
  SAFETY_RULES,
  TOPIC_RULES,
  TOPIC_RULESET_VERSION,
  type TopicRule,
} from './rules';

export interface TopicAnalysisInput {
  normalizedText: string;
  language: PreprocessLanguage;
}

export interface TopicAnalysisResult {
  topics: FeedbackTopic[];
  intents: TopicIntent[];
  safetyFlags: CommentSafetyFlag[];
  confidence: number;
  ruleHits: string[];
  ruleSetVersion: typeof TOPIC_RULESET_VERSION;
}

interface TopicMatch {
  topic: FeedbackTopic;
  score: number;
  hits: string[];
}

const PROXIMITY_WINDOW = 56;
const TOPIC_THRESHOLD = 1.2;
const PHONE_PATTERN = /(?:\+?\d[\s.-]?){8,}\d/u;

export function analyzeTopics(input: TopicAnalysisInput): TopicAnalysisResult {
  const normalizedText = input.normalizedText.trim();
  if (!normalizedText) {
    return emptyResult();
  }

  const searchableText = normalizedText.toLocaleLowerCase('en-US');
  const topicMatches = TOPIC_RULES.map((rule) => matchTopic(searchableText, rule)).filter(
    (match) => match.score >= TOPIC_THRESHOLD,
  );
  const intents = INTENT_RULES.filter((rule) => rule.terms.some((term) => includesTerm(searchableText, term))).map(
    (rule) => rule.intent,
  );
  const safetyFlags = detectSafetyFlags(searchableText);
  const ruleHits = [
    ...topicMatches.flatMap((match) => match.hits),
    ...intents.map((intent) => `intent:${intent}`),
    ...safetyFlags.map((flag) => `safety:${flag}`),
  ];

  return {
    topics: topicMatches.map((match) => match.topic),
    intents,
    safetyFlags,
    confidence: round(clamp(topicMatches.reduce((max, match) => Math.max(max, match.score), 0) / 3, 0, 1)),
    ruleHits: unique(ruleHits),
    ruleSetVersion: TOPIC_RULESET_VERSION,
  };
}

function emptyResult(): TopicAnalysisResult {
  return {
    topics: [],
    intents: [],
    safetyFlags: [],
    confidence: 0,
    ruleHits: [],
    ruleSetVersion: TOPIC_RULESET_VERSION,
  };
}

function matchTopic(text: string, rule: TopicRule): TopicMatch {
  const strongHit = rule.strongPhrases.find((phrase) => includesTerm(text, phrase));
  if (strongHit) {
    return { topic: rule.topic, score: 2.4, hits: [`topic:${rule.topic}:phrase:${strongHit}`] };
  }

  const proximityHit = findProximityHit(text, rule.subjectTerms, rule.qualifierTerms);
  if (proximityHit) {
    return {
      topic: rule.topic,
      score: 1.4,
      hits: [`topic:${rule.topic}:near:${proximityHit.subject}+${proximityHit.qualifier}`],
    };
  }

  return { topic: rule.topic, score: 0, hits: [] };
}

function findProximityHit(
  text: string,
  subjects: readonly string[],
  qualifiers: readonly string[],
): { subject: string; qualifier: string } | undefined {
  for (const subject of subjects) {
    const subjectIndexes = findAllTermIndexes(text, subject);
    if (subjectIndexes.length === 0) {
      continue;
    }

    for (const qualifier of qualifiers) {
      const qualifierIndexes = findAllTermIndexes(text, qualifier);
      if (qualifierIndexes.some((qualifierIndex) => subjectIndexes.some((subjectIndex) => isNear(subjectIndex, qualifierIndex)))) {
        return { subject, qualifier };
      }
    }
  }

  return undefined;
}

function detectSafetyFlags(text: string): CommentSafetyFlag[] {
  const flags = new Set<CommentSafetyFlag>();

  for (const rule of SAFETY_RULES) {
    if (rule.flag === 'sensitive-info' && PHONE_PATTERN.test(text)) {
      flags.add(rule.flag);
      continue;
    }

    if (rule.terms.some((term) => includesTerm(text, term))) {
      if (rule.flag === 'personal-attack') {
        if (isLikelyPersonalAttack(text)) {
          flags.add(rule.flag);
        }
        continue;
      }

      if (rule.flag === 'hate-or-harassment') {
        if (/(hate|싫|사라|disappear|꺼져)/u.test(text)) {
          flags.add(rule.flag);
        }
        continue;
      }

      flags.add(rule.flag);
    }
  }

  return Array.from(flags);
}

function isLikelyPersonalAttack(text: string): boolean {
  const hasTarget = /\b(you|your|creator)\b|너|당신|작성자|크리에이터/u.test(text);
  return hasTarget && PERSONAL_ATTACK_TERMS.some((term) => includesTerm(text, term));
}

function findAllTermIndexes(text: string, term: string): number[] {
  const indexes: number[] = [];
  let index = text.indexOf(term.toLocaleLowerCase('en-US'));

  while (index >= 0) {
    if (hasTermBoundary(text, term, index)) {
      indexes.push(index);
    }
    index = text.indexOf(term.toLocaleLowerCase('en-US'), index + Math.max(1, term.length));
  }

  return indexes;
}

function includesTerm(text: string, term: string): boolean {
  return findAllTermIndexes(text, term).length > 0;
}

function hasTermBoundary(text: string, term: string, index: number): boolean {
  if (containsHangul(term) || term === '?' || term.startsWith('<')) {
    return true;
  }

  const before = index === 0 ? '' : (text[index - 1] ?? '');
  const after = index + term.length >= text.length ? '' : (text[index + term.length] ?? '');

  return !isAsciiWord(before) && !isAsciiWord(after);
}

function isNear(left: number, right: number): boolean {
  return Math.abs(left - right) <= PROXIMITY_WINDOW;
}

function containsHangul(value: string): boolean {
  return /\p{Script=Hangul}/u.test(value);
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

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
