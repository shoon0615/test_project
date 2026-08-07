import { ANALYSIS_VERSION, COMMENT_COLLECTION, REPORT_SCHEMA_VERSION } from '../../config/analysis';
import type { ReportsStorage } from '../../storage/reports';
import { createReportsStorage } from '../../storage/reports';
import type {
  AnalysisPayload,
  AnalysisReport,
  AnalysisState,
  AppError,
  AppErrorCode,
  AnalysisStage,
  RawComment,
  ReportWarning,
  SourceOrder,
  VideoSummary,
} from '../../types/domain';
import { validateAnalysisReport } from '../../types/domain';
import { AnalysisWorkerClient, AnalysisWorkerClientError } from '../../workers/client';
import { createYouTubeApiAdapter, type CommentCollectionResult, type YouTubeApiAdapter } from '../youtube/api';
import { createAppError } from '../youtube/errors';
import { parseYouTubeUrl } from '../youtube/url';
import { analysisReducer, initialAnalysisState, type AnalysisAction } from './reducer';

export interface AnalysisWorkerPort {
  analyze: (input: {
    jobId: string;
    comments: RawComment[];
    signal?: AbortSignal;
    onProgress?: (message: { type: 'PROGRESS'; jobId: string; stage: AnalysisStage; processed: number; total: number }) => void;
  }) => Promise<AnalysisPayload>;
  terminate: () => void;
}

export interface AnalysisOrchestratorOptions {
  youtube?: YouTubeApiAdapter;
  worker?: AnalysisWorkerPort;
  storage?: Pick<ReportsStorage, 'saveReport'>;
  dispatch?: (state: AnalysisState) => void;
  createJobId?: () => string;
  createReportId?: () => string;
  createDiagnosticId?: () => string;
  now?: () => string;
}

interface ActiveRun {
  key: string;
  jobId: string;
  controller: AbortController;
  promise: Promise<void>;
}

export class AnalysisOrchestrator {
  private readonly youtube: YouTubeApiAdapter;
  private readonly worker: AnalysisWorkerPort;
  private readonly storage: Pick<ReportsStorage, 'saveReport'>;
  private readonly dispatchState: (state: AnalysisState) => void;
  private readonly createJobId: () => string;
  private readonly createReportId: () => string;
  private readonly createDiagnosticId: () => string;
  private readonly now: () => string;
  private state: AnalysisState = initialAnalysisState;
  private activeRun?: ActiveRun;

  constructor(options: AnalysisOrchestratorOptions = {}) {
    this.youtube = options.youtube ?? createYouTubeApiAdapter();
    this.worker = options.worker ?? new AnalysisWorkerClient();
    this.storage = options.storage ?? createReportsStorage();
    this.dispatchState = options.dispatch ?? (() => undefined);
    this.createJobId = options.createJobId ?? defaultId;
    this.createReportId = options.createReportId ?? defaultId;
    this.createDiagnosticId = options.createDiagnosticId ?? defaultId;
    this.now = options.now ?? defaultNow;
  }

  getState(): AnalysisState {
    return this.state;
  }

  submit(input: string, order: SourceOrder = 'relevance'): Promise<void> {
    const parsed = parseYouTubeUrl(input);
    const key = parsed.ok ? `${parsed.value.videoId}:${order}` : `invalid:${input}`;

    if (this.activeRun && !this.activeRun.controller.signal.aborted && this.activeRun.key === key) {
      return this.activeRun.promise;
    }

    this.cancelActiveRun();

    const jobId = this.createJobId();
    const controller = new AbortController();
    const promise = this.run({ input, order, jobId, parsed, signal: controller.signal }).finally(() => {
      if (this.activeRun?.jobId === jobId) {
        this.activeRun = undefined;
      }
    });

    this.activeRun = { key, jobId, controller, promise };
    return promise;
  }

  cancel(): void {
    const activeRun = this.activeRun;
    if (!activeRun || activeRun.controller.signal.aborted) {
      return;
    }

    activeRun.controller.abort();
    this.dispatch({ type: 'CANCELLED', jobId: activeRun.jobId });
  }

  dispose(): void {
    this.cancelActiveRun();
    this.worker.terminate();
  }

  private async run(input: {
    input: string;
    order: SourceOrder;
    jobId: string;
    parsed: ReturnType<typeof parseYouTubeUrl>;
    signal: AbortSignal;
  }): Promise<void> {
    this.dispatch({ type: 'SUBMIT', jobId: input.jobId, input: input.input });

    if (!input.parsed.ok) {
      this.dispatch({ type: 'FAILED', jobId: input.jobId, error: this.makeError('INVALID_URL', 'validation', false, 'validating') });
      return;
    }

    try {
      this.throwIfAborted(input.signal, input.jobId, 'validating');
      this.dispatch({ type: 'FETCH_VIDEO_STARTED', jobId: input.jobId });
      const video = await this.youtube.fetchVideo({ videoId: input.parsed.value.videoId, signal: input.signal });
      this.throwIfAborted(input.signal, input.jobId, 'fetching-video');

      this.dispatch({ type: 'VIDEO_FETCHED', jobId: input.jobId, video });
      const collection = await this.youtube.fetchComments({
        videoId: video.id,
        order: input.order,
        signal: input.signal,
        onProgress: (event) => {
          this.dispatch({ type: 'COMMENTS_PROGRESS', jobId: input.jobId, page: event.page, collectedCount: event.collectedCount });
        },
      });
      this.throwIfAborted(input.signal, input.jobId, 'fetching-comments');

      if (collection.comments.length === 0) {
        this.dispatch({ type: 'EMPTY', jobId: input.jobId, reason: 'no-comments' });
        return;
      }

      this.dispatch({ type: 'ANALYSIS_STARTED', jobId: input.jobId, total: collection.comments.length });
      const payload = await this.worker.analyze({
        jobId: input.jobId,
        comments: collection.comments,
        signal: input.signal,
        onProgress: (message) => {
          this.dispatch({ type: 'ANALYSIS_PROGRESS', jobId: input.jobId, processed: message.processed, total: message.total });
        },
      });
      this.throwIfAborted(input.signal, input.jobId, 'analyzing');

      if (collection.collectionStatus === 'partial' && payload.sampleSize < COMMENT_COLLECTION.minimumSampleSize) {
        this.dispatch({ type: 'EMPTY', jobId: input.jobId, reason: 'insufficient-sample' });
        return;
      }

      this.dispatch({ type: 'BUILDING_REPORT_STARTED', jobId: input.jobId });
      const report = this.buildReport({ jobId: input.jobId, order: input.order, video, collection, payload });
      const validated = validateAnalysisReport(report);
      if (!validated.ok) {
        this.dispatch({ type: 'FAILED', jobId: input.jobId, error: this.makeError('ANALYSIS_FAILED', 'analysis', true, 'building-report') });
        return;
      }

      const storedReport = this.saveReportWithWarning(validated.value);
      this.dispatch({ type: 'REPORT_READY', jobId: input.jobId, report: storedReport });
    } catch (error) {
      const appError = this.normalizeError(error);
      if (appError.code === 'CANCELLED') {
        this.dispatch({ type: 'CANCELLED', jobId: input.jobId });
        return;
      }
      if (appError.code === 'NO_COMMENTS') {
        this.dispatch({ type: 'EMPTY', jobId: input.jobId, reason: 'no-comments' });
        return;
      }

      this.dispatch({ type: 'FAILED', jobId: input.jobId, error: appError });
    }
  }

  private buildReport(input: {
    jobId: string;
    order: SourceOrder;
    video: VideoSummary;
    collection: CommentCollectionResult;
    payload: AnalysisPayload;
  }): AnalysisReport {
    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      analysisVersion: ANALYSIS_VERSION,
      reportId: this.createReportId(),
      jobId: input.jobId,
      video: input.video,
      analyzedAt: this.now(),
      sourceOrder: input.order,
      collectionStatus: input.collection.collectionStatus,
      warnings: this.buildWarnings(input.collection, input.payload),
      collectedCount: input.payload.comments.length,
      sampleSize: input.payload.sampleSize,
      excludedCounts: input.payload.excludedCounts,
      sentimentCounts: input.payload.sentimentCounts,
      strengths: input.payload.strengths,
      improvements: input.payload.improvements,
      contentIdeas: input.payload.contentIdeas,
      comments: input.payload.comments,
    };
  }

  private buildWarnings(collection: CommentCollectionResult, payload: AnalysisPayload): ReportWarning[] {
    const warnings: ReportWarning[] = [];

    if (collection.collectionStatus === 'partial') {
      warnings.push(
        collection.warning ?? {
          code: 'PARTIAL_COLLECTION',
          message: '댓글 일부만 수집됨',
          page: 1,
          collectedCount: payload.comments.length,
          errorCode: 'UNKNOWN_ERROR',
        },
      );
    }

    if (payload.sampleSize > 0 && payload.sampleSize < COMMENT_COLLECTION.minimumSampleSize) {
      warnings.push({
        code: 'LOW_SAMPLE',
        message: '유효 표본이 10개 미만이라 순위형 인사이트를 생성하지 않았습니다.',
        collectedCount: payload.comments.length,
      });
    }

    if (payload.comments.length >= COMMENT_COLLECTION.maxComments) {
      warnings.push({
        code: 'SAMPLE_LIMIT_REACHED',
        message: '상위 댓글 300개 기준으로 분석했습니다.',
        collectedCount: payload.comments.length,
      });
    }

    if (payload.excludedCounts['unsupported-language'] > payload.sampleSize) {
      warnings.push({
        code: 'UNSUPPORTED_LANGUAGE_LIMIT',
        message: '지원 언어가 아닌 댓글이 유효 표본보다 많아 결과 해석에 제한이 있습니다.',
        collectedCount: payload.comments.length,
      });
    }

    return warnings;
  }

  private saveReportWithWarning(report: AnalysisReport): AnalysisReport {
    const result = this.storage.saveReport(report);
    if (isStorageSuccess(result)) {
      return report;
    }

    const warning: ReportWarning = {
      code: 'STORAGE_UNAVAILABLE',
      message: '기기에 저장하지 못함',
      collectedCount: report.collectedCount,
      errorCode: result.error.code,
    };
    const nextReport = { ...report, warnings: [...report.warnings, warning] };
    const validated = validateAnalysisReport(nextReport);

    return validated.ok ? validated.value : report;
  }

  private cancelActiveRun(): void {
    if (!this.activeRun || this.activeRun.controller.signal.aborted) {
      return;
    }

    this.activeRun.controller.abort();
  }

  private dispatch(action: AnalysisAction): void {
    this.state = analysisReducer(this.state, action);
    this.dispatchState(this.state);
  }

  private throwIfAborted(signal: AbortSignal, jobId: string, stage: AppError['stage']): void {
    if (!signal.aborted) {
      return;
    }

    throw this.makeError('CANCELLED', 'network', false, stage, { jobId });
  }

  private normalizeError(error: unknown): AppError {
    if (isAppErrorLike(error)) {
      return {
        code: error.code,
        kind: error.kind,
        retryable: error.retryable,
        stage: error.stage,
        diagnosticId: error.diagnosticId,
        ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
        ...(error.upstreamReason === undefined ? {} : { upstreamReason: error.upstreamReason }),
        ...(error.safeContext === undefined ? {} : { safeContext: error.safeContext }),
      };
    }

    if (error instanceof AnalysisWorkerClientError) {
      return this.makeError(error.code, 'analysis', error.code !== 'CANCELLED', 'analyzing');
    }

    return this.makeError('UNKNOWN_ERROR', 'upstream', false, 'error');
  }

  private makeError(
    code: AppErrorCode,
    kind: AppError['kind'],
    retryable: boolean,
    stage: AppError['stage'],
    context?: { jobId?: string },
  ): ReturnType<typeof createAppError> {
    return createAppError({
      code,
      kind,
      retryable,
      stage,
      diagnosticId: context?.jobId ? `${this.createDiagnosticId()}-${context.jobId}` : this.createDiagnosticId(),
    });
  }
}

function isStorageSuccess(value: unknown): value is { ok: true; value: AnalysisReport[] } {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === true;
}

function isAppErrorLike(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'kind' in value &&
    'retryable' in value &&
    'stage' in value &&
    'diagnosticId' in value
  );
}

function defaultId(): string {
  return crypto.randomUUID();
}

function defaultNow(): string {
  return new Date().toISOString();
}
