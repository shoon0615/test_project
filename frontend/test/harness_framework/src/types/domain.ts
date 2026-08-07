import { COMMENT_COLLECTION, REPORT_SCHEMA_VERSION } from '../config/analysis';

export const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const LANGUAGES = ['ko', 'en', 'unknown', 'unsupported'] as const;
export type CommentLanguage = (typeof LANGUAGES)[number];

export const FEEDBACK_TOPICS = [
  'content',
  'delivery',
  'editing',
  'audio',
  'pace',
  'captions',
  'correction',
  'follow-up',
] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export const TOPIC_INTENTS = ['praise', 'complaint', 'question', 'request'] as const;
export type TopicIntent = (typeof TOPIC_INTENTS)[number];

export const COMMENT_SAFETY_FLAGS = ['personal-attack', 'hate-or-harassment', 'sensitive-info'] as const;
export type CommentSafetyFlag = (typeof COMMENT_SAFETY_FLAGS)[number];

export const EXCLUDE_REASONS = [
  'duplicate',
  'spam',
  'too-short',
  'unsupported-language',
  'no-analyzable-text',
] as const;
export type ExcludeReason = (typeof EXCLUDE_REASONS)[number];

export const SOURCE_ORDERS = ['relevance', 'time'] as const;
export type SourceOrder = (typeof SOURCE_ORDERS)[number];

export const COLLECTION_STATUSES = ['complete', 'partial'] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const APP_STAGES = [
  'idle',
  'validating',
  'fetching-video',
  'fetching-comments',
  'analyzing',
  'building-report',
  'success',
  'partial-success',
  'empty',
  'error',
  'cancelled',
] as const;
export type AppStage = (typeof APP_STAGES)[number];

export const ANALYSIS_STAGES = [
  'normalizing',
  'filtering',
  'scoring-sentiment',
  'classifying-topics',
  'ranking-evidence',
  'building-payload',
] as const;
export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export const APP_ERROR_CODES = [
  'INVALID_URL',
  'VIDEO_NOT_FOUND',
  'COMMENTS_DISABLED',
  'QUOTA_EXCEEDED',
  'NETWORK_ERROR',
  'NO_COMMENTS',
  'API_KEY_MISSING',
  'API_KEY_INVALID',
  'API_KEY_RESTRICTED',
  'API_FORBIDDEN',
  'INVALID_API_REQUEST',
  'UPSTREAM_PROCESSING_FAILURE',
  'RATE_LIMITED',
  'YOUTUBE_UNAVAILABLE',
  'CANCELLED',
  'REQUEST_TIMEOUT',
  'PAGINATION_INVALID',
  'WORKER_INIT_FAILED',
  'ANALYSIS_FAILED',
  'STORAGE_UNAVAILABLE',
  'STORAGE_QUOTA_EXCEEDED',
  'STORAGE_CORRUPTED',
  'UNKNOWN_ERROR',
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const APP_ERROR_KINDS = [
  'validation',
  'configuration',
  'permission',
  'quota',
  'network',
  'upstream',
  'analysis',
  'storage',
] as const;
export type AppErrorKind = (typeof APP_ERROR_KINDS)[number];

export const REPORT_WARNING_CODES = [
  'PARTIAL_COLLECTION',
  'SAMPLE_LIMIT_REACHED',
  'LOW_SAMPLE',
  'STORAGE_UNAVAILABLE',
  'UNSUPPORTED_LANGUAGE_LIMIT',
] as const;
export type ReportWarningCode = (typeof REPORT_WARNING_CODES)[number];

export interface RawComment {
  id: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface AnalyzedComment extends RawComment {
  sentiment: Sentiment;
  sentimentScore: number;
  confidence: number;
  language: CommentLanguage;
  topics: FeedbackTopic[];
  excludedReason?: ExcludeReason;
  normalizedHash: string;
}

export interface VideoSummary {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  commentCount?: number;
}

export interface Insight {
  title: string;
  description: string;
  mentionCount: number;
  evidenceCommentIds: string[];
  action?: string;
}

export interface ReportWarning {
  code: ReportWarningCode;
  message: string;
  page?: number;
  collectedCount?: number;
  errorCode?: AppErrorCode;
}

export interface AnalysisReport {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  analysisVersion: string;
  reportId: string;
  jobId: string;
  video: VideoSummary;
  analyzedAt: string;
  sourceOrder: SourceOrder;
  collectionStatus: CollectionStatus;
  warnings: ReportWarning[];
  collectedCount: number;
  sampleSize: number;
  excludedCounts: Record<ExcludeReason, number>;
  sentimentCounts: Record<Sentiment, number>;
  strengths: Insight[];
  improvements: Insight[];
  contentIdeas: Insight[];
  comments: AnalyzedComment[];
}

export interface AppError {
  code: AppErrorCode;
  kind: AppErrorKind;
  retryable: boolean;
  stage: AppStage;
  httpStatus?: number;
  upstreamReason?: string;
  diagnosticId: string;
  safeContext?: {
    page?: number;
    collectedCount?: number;
  };
  cause?: unknown;
}

export type AnalysisState =
  | { status: 'idle'; input: string }
  | { status: 'validating'; jobId: string; input: string }
  | { status: 'fetching-video'; jobId: string; input: string }
  | { status: 'fetching-comments'; jobId: string; input: string; video: VideoSummary; collectedCount: number; page: number }
  | { status: 'analyzing'; jobId: string; input: string; video: VideoSummary; processed: number; total: number }
  | { status: 'building-report'; jobId: string; input: string; video: VideoSummary }
  | { status: 'success'; input: string; report: AnalysisReport }
  | { status: 'partial-success'; input: string; report: AnalysisReport }
  | { status: 'empty'; input: string; jobId: string; reason: 'no-comments' | 'insufficient-sample'; video?: VideoSummary }
  | { status: 'error'; input: string; error: AppError; video?: VideoSummary }
  | { status: 'cancelled'; input: string; jobId: string; video?: VideoSummary };

export interface AnalysisPayload {
  comments: AnalyzedComment[];
  sampleSize: number;
  excludedCounts: Record<ExcludeReason, number>;
  sentimentCounts: Record<Sentiment, number>;
  strengths: Insight[];
  improvements: Insight[];
  contentIdeas: Insight[];
}

export type WorkerRequest =
  | { type: 'ANALYZE'; jobId: string; comments: RawComment[]; configVersion: string }
  | { type: 'CANCEL'; jobId: string };

export type WorkerResponse =
  | { type: 'PROGRESS'; jobId: string; stage: AnalysisStage; processed: number; total: number }
  | { type: 'RESULT'; jobId: string; payload: AnalysisPayload }
  | { type: 'ERROR'; jobId: string; code: 'WORKER_INIT_FAILED' | 'ANALYSIS_FAILED' }
  | { type: 'CANCELLED'; jobId: string };

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: string[] };

export function validateAnalysisReport(value: unknown): ValidationResult<AnalysisReport> {
  const issues: string[] = [];

  if (!isAnalysisReportShape(value, issues)) {
    return { ok: false, issues };
  }

  validateReportInvariants(value, issues);

  return issues.length === 0 ? { ok: true, value } : { ok: false, issues };
}

export function isAppError(value: unknown): value is AppError {
  const object = asRecord(value);
  if (!object) {
    return false;
  }

  return (
    isOneOf(object.code, APP_ERROR_CODES) &&
    isOneOf(object.kind, APP_ERROR_KINDS) &&
    typeof object.retryable === 'boolean' &&
    isOneOf(object.stage, APP_STAGES) &&
    typeof object.diagnosticId === 'string' &&
    isOptionalNonNegativeInteger(object.httpStatus) &&
    isOptionalString(object.upstreamReason) &&
    isSafeContext(object.safeContext) &&
    !Object.hasOwn(object, 'cause')
  );
}

export function validateWorkerRequest(value: unknown): ValidationResult<WorkerRequest> {
  const issues: string[] = [];
  const object = asRecord(value);
  if (!object) {
    return { ok: false, issues: ['worker request must be an object'] };
  }

  if (object.type === 'CANCEL') {
    if (typeof object.jobId !== 'string') {
      issues.push('worker request jobId must be a string');
    }
    return issues.length === 0 ? { ok: true, value: { type: 'CANCEL', jobId: object.jobId as string } } : { ok: false, issues };
  }

  if (object.type !== 'ANALYZE') {
    return { ok: false, issues: ['worker request type is invalid'] };
  }

  if (typeof object.jobId !== 'string') {
    issues.push('worker request jobId must be a string');
  }
  if (typeof object.configVersion !== 'string') {
    issues.push('worker request configVersion must be a string');
  }
  if (!Array.isArray(object.comments) || !object.comments.every(isRawComment)) {
    issues.push('worker request comments must be RawComment[]');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      type: 'ANALYZE',
      jobId: object.jobId as string,
      configVersion: object.configVersion as string,
      comments: object.comments as RawComment[],
    },
  };
}

export function validateWorkerResponse(value: unknown): ValidationResult<WorkerResponse> {
  const issues: string[] = [];
  const object = asRecord(value);
  if (!object) {
    return { ok: false, issues: ['worker response must be an object'] };
  }

  if (typeof object.jobId !== 'string') {
    issues.push('worker response jobId must be a string');
  }

  if (object.type === 'PROGRESS') {
    if (!isOneOf(object.stage, ANALYSIS_STAGES)) {
      issues.push('worker progress stage is invalid');
    }
    if (!isNonNegativeInteger(object.processed) || !isNonNegativeInteger(object.total)) {
      issues.push('worker progress counts must be non-negative integers');
    }
    if (issues.length > 0) {
      return { ok: false, issues };
    }
    return {
      ok: true,
      value: {
        type: 'PROGRESS',
        jobId: object.jobId as string,
        stage: object.stage as AnalysisStage,
        processed: object.processed as number,
        total: object.total as number,
      },
    };
  }

  if (object.type === 'RESULT') {
    if (!isAnalysisPayload(object.payload)) {
      issues.push('worker result payload is invalid');
    }
    if (issues.length > 0) {
      return { ok: false, issues };
    }
    return { ok: true, value: { type: 'RESULT', jobId: object.jobId as string, payload: object.payload as AnalysisPayload } };
  }

  if (object.type === 'ERROR') {
    if (object.code !== 'WORKER_INIT_FAILED' && object.code !== 'ANALYSIS_FAILED') {
      issues.push('worker error code is invalid');
    }
    if (issues.length > 0) {
      return { ok: false, issues };
    }
    return { ok: true, value: { type: 'ERROR', jobId: object.jobId as string, code: object.code as WorkerResponseErrorCode } };
  }

  if (object.type === 'CANCELLED') {
    if (issues.length > 0) {
      return { ok: false, issues };
    }
    return { ok: true, value: { type: 'CANCELLED', jobId: object.jobId as string } };
  }

  return { ok: false, issues: ['worker response type is invalid'] };
}

type WorkerResponseErrorCode = Extract<WorkerResponse, { type: 'ERROR' }>['code'];

function isAnalysisReportShape(value: unknown, issues: string[]): value is AnalysisReport {
  const object = asRecord(value);
  if (!object) {
    issues.push('report must be an object');
    return false;
  }

  requireLiteral(object.schemaVersion, REPORT_SCHEMA_VERSION, 'schemaVersion', issues);
  requireString(object.analysisVersion, 'analysisVersion', issues);
  requireString(object.reportId, 'reportId', issues);
  requireString(object.jobId, 'jobId', issues);
  requireIsoDateString(object.analyzedAt, 'analyzedAt', issues);
  requireOneOf(object.sourceOrder, SOURCE_ORDERS, 'sourceOrder', issues);
  requireOneOf(object.collectionStatus, COLLECTION_STATUSES, 'collectionStatus', issues);
  requireNonNegativeInteger(object.collectedCount, 'collectedCount', issues);
  requireNonNegativeInteger(object.sampleSize, 'sampleSize', issues);

  if (!isVideoSummary(object.video)) {
    issues.push('video must be a valid VideoSummary');
  }
  if (!Array.isArray(object.warnings) || !object.warnings.every(isReportWarning)) {
    issues.push('warnings must be ReportWarning[]');
  }
  if (!isCountRecord(object.excludedCounts, EXCLUDE_REASONS)) {
    issues.push('excludedCounts must include every ExcludeReason');
  }
  if (!isCountRecord(object.sentimentCounts, SENTIMENTS)) {
    issues.push('sentimentCounts must include every Sentiment');
  }
  if (!Array.isArray(object.strengths) || !object.strengths.every(isInsight)) {
    issues.push('strengths must be Insight[]');
  }
  if (!Array.isArray(object.improvements) || !object.improvements.every(isInsight)) {
    issues.push('improvements must be Insight[]');
  }
  if (!Array.isArray(object.contentIdeas) || !object.contentIdeas.every(isInsight)) {
    issues.push('contentIdeas must be Insight[]');
  }
  if (!Array.isArray(object.comments) || !object.comments.every(isAnalyzedComment)) {
    issues.push('comments must be AnalyzedComment[]');
  }

  return issues.length === 0;
}

function validateReportInvariants(report: AnalysisReport, issues: string[]): void {
  const excludedTotal = sumCountRecord(report.excludedCounts, EXCLUDE_REASONS);
  if (report.sampleSize + excludedTotal !== report.collectedCount) {
    issues.push('sampleSize plus excludedCounts must equal collectedCount');
  }

  const sentimentTotal = sumCountRecord(report.sentimentCounts, SENTIMENTS);
  if (sentimentTotal !== report.sampleSize) {
    issues.push('sentimentCounts must sum to sampleSize');
  }

  const includedCommentIds = new Set(report.comments.filter((comment) => comment.excludedReason === undefined).map((comment) => comment.id));
  for (const insight of [...report.strengths, ...report.improvements, ...report.contentIdeas]) {
    if (new Set(insight.evidenceCommentIds).size !== insight.evidenceCommentIds.length) {
      issues.push('insight evidenceCommentIds must be unique');
    }
    if (!insight.evidenceCommentIds.every((id) => includedCommentIds.has(id))) {
      issues.push('insight evidenceCommentIds must reference included comments');
    }
    if (insight.mentionCount < insight.evidenceCommentIds.length) {
      issues.push('insight mentionCount cannot be smaller than evidence count');
    }
  }

  if (
    report.sampleSize < COMMENT_COLLECTION.minimumSampleSize &&
    (report.strengths.length > 0 || report.improvements.length > 0 || report.contentIdeas.length > 0)
  ) {
    issues.push('reports below the minimum sample size cannot include ranked insights');
  }

  if (
    report.collectionStatus === 'partial' &&
    !report.warnings.some(
      (warning) =>
        warning.code === 'PARTIAL_COLLECTION' &&
        isNonNegativeInteger(warning.page) &&
        isOneOf(warning.errorCode, APP_ERROR_CODES),
    )
  ) {
    issues.push('partial reports require a warning with page and errorCode');
  }
}

function isAnalysisPayload(value: unknown): value is AnalysisPayload {
  const object = asRecord(value);
  return (
    object !== undefined &&
    Array.isArray(object.comments) &&
    object.comments.every(isAnalyzedComment) &&
    isNonNegativeInteger(object.sampleSize) &&
    isCountRecord(object.excludedCounts, EXCLUDE_REASONS) &&
    isCountRecord(object.sentimentCounts, SENTIMENTS) &&
    Array.isArray(object.strengths) &&
    object.strengths.every(isInsight) &&
    Array.isArray(object.improvements) &&
    object.improvements.every(isInsight) &&
    Array.isArray(object.contentIdeas) &&
    object.contentIdeas.every(isInsight)
  );
}

function isRawComment(value: unknown): value is RawComment {
  const object = asRecord(value);
  return (
    object !== undefined &&
    typeof object.id === 'string' &&
    typeof object.text === 'string' &&
    isNonNegativeInteger(object.likeCount) &&
    isIsoDateString(object.publishedAt)
  );
}

function isAnalyzedComment(value: unknown): value is AnalyzedComment {
  const object = asRecord(value);
  return (
    isRawComment(value) &&
    object !== undefined &&
    isOneOf(object.sentiment, SENTIMENTS) &&
    isFiniteNumber(object.sentimentScore) &&
    isFiniteNumber(object.confidence) &&
    isOneOf(object.language, LANGUAGES) &&
    Array.isArray(object.topics) &&
    object.topics.every((topic) => isOneOf(topic, FEEDBACK_TOPICS)) &&
    (object.excludedReason === undefined || isOneOf(object.excludedReason, EXCLUDE_REASONS)) &&
    typeof object.normalizedHash === 'string'
  );
}

function isVideoSummary(value: unknown): value is VideoSummary {
  const object = asRecord(value);
  return (
    object !== undefined &&
    typeof object.id === 'string' &&
    typeof object.title === 'string' &&
    typeof object.channelTitle === 'string' &&
    isOptionalString(object.thumbnailUrl) &&
    (object.publishedAt === undefined || isIsoDateString(object.publishedAt)) &&
    isOptionalNonNegativeInteger(object.commentCount)
  );
}

function isInsight(value: unknown): value is Insight {
  const object = asRecord(value);
  return (
    object !== undefined &&
    typeof object.title === 'string' &&
    typeof object.description === 'string' &&
    isNonNegativeInteger(object.mentionCount) &&
    Array.isArray(object.evidenceCommentIds) &&
    object.evidenceCommentIds.every((id) => typeof id === 'string') &&
    isOptionalString(object.action)
  );
}

function isReportWarning(value: unknown): value is ReportWarning {
  const object = asRecord(value);
  return (
    object !== undefined &&
    isOneOf(object.code, REPORT_WARNING_CODES) &&
    typeof object.message === 'string' &&
    isOptionalNonNegativeInteger(object.page) &&
    isOptionalNonNegativeInteger(object.collectedCount) &&
    (object.errorCode === undefined || isOneOf(object.errorCode, APP_ERROR_CODES))
  );
}

function isSafeContext(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  const object = asRecord(value);
  return object !== undefined && isOptionalNonNegativeInteger(object.page) && isOptionalNonNegativeInteger(object.collectedCount);
}

function isCountRecord<const Keys extends readonly string[]>(value: unknown, keys: Keys): value is Record<Keys[number], number> {
  const object = asRecord(value);
  return object !== undefined && keys.every((key) => isNonNegativeInteger(object[key]));
}

function sumCountRecord<Key extends string>(record: Record<Key, number>, keys: readonly Key[]): number {
  return keys.reduce((total, key) => total + record[key], 0);
}

function requireString(value: unknown, field: string, issues: string[]): void {
  if (typeof value !== 'string') {
    issues.push(`${field} must be a string`);
  }
}

function requireIsoDateString(value: unknown, field: string, issues: string[]): void {
  if (!isIsoDateString(value)) {
    issues.push(`${field} must be an ISO date string`);
  }
}

function requireNonNegativeInteger(value: unknown, field: string, issues: string[]): void {
  if (!isNonNegativeInteger(value)) {
    issues.push(`${field} must be a non-negative integer`);
  }
}

function requireLiteral(value: unknown, expected: unknown, field: string, issues: string[]): void {
  if (value !== expected) {
    issues.push(`${field} is unsupported`);
  }
}

function requireOneOf(value: unknown, values: readonly unknown[], field: string, issues: string[]): void {
  if (!isOneOf(value, values)) {
    issues.push(`${field} is invalid`);
  }
}

function isOneOf<Value>(value: unknown, values: readonly Value[]): value is Value {
  return values.some((candidate) => Object.is(candidate, value));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || isNonNegativeInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
