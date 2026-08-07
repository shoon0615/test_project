import { ANALYSIS_VERSION } from '../config/analysis';
import type { AnalysisPayload, RawComment, WorkerRequest, WorkerResponse } from '../types/domain';
import { validateWorkerResponse } from '../types/domain';

export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  addEventListener(type: 'message' | 'error', listener: EventListener): void;
  removeEventListener(type: 'message' | 'error', listener: EventListener): void;
}

export interface AnalysisWorkerClientOptions {
  createWorker?: () => WorkerLike;
  configVersion?: string;
}

export interface AnalyzeWithWorkerInput {
  jobId: string;
  comments: RawComment[];
  signal?: AbortSignal;
  onProgress?: (message: Extract<WorkerResponse, { type: 'PROGRESS' }>) => void;
}

type WorkerClientErrorCode = 'CANCELLED' | 'WORKER_INIT_FAILED' | 'ANALYSIS_FAILED';

interface ActiveJob {
  jobId: string;
  request: Extract<WorkerRequest, { type: 'ANALYZE' }>;
  retriedAfterCrash: boolean;
  settled: boolean;
  resolve: (payload: AnalysisPayload) => void;
  reject: (error: AnalysisWorkerClientError) => void;
  onProgress?: (message: Extract<WorkerResponse, { type: 'PROGRESS' }>) => void;
  abortHandler?: () => void;
  signal?: AbortSignal;
}

export class AnalysisWorkerClientError extends Error {
  constructor(readonly code: WorkerClientErrorCode) {
    super(code);
    this.name = 'AnalysisWorkerClientError';
  }
}

export class AnalysisWorkerClient {
  private readonly createWorker: () => WorkerLike;
  private readonly configVersion: string;
  private worker: WorkerLike;
  private activeJob?: ActiveJob;

  constructor(options: AnalysisWorkerClientOptions = {}) {
    this.createWorker = options.createWorker ?? createBrowserWorker;
    this.configVersion = options.configVersion ?? ANALYSIS_VERSION;
    this.worker = this.createWorker();
    this.attachWorkerListeners();
  }

  analyze(input: AnalyzeWithWorkerInput): Promise<AnalysisPayload> {
    this.cancelActiveJob();

    const request: Extract<WorkerRequest, { type: 'ANALYZE' }> = {
      type: 'ANALYZE',
      jobId: input.jobId,
      configVersion: this.configVersion,
      comments: input.comments.map(toWorkerComment),
    };

    return new Promise<AnalysisPayload>((resolve, reject) => {
      const activeJob: ActiveJob = {
        jobId: input.jobId,
        request,
        retriedAfterCrash: false,
        settled: false,
        resolve,
        reject,
        ...(input.onProgress ? { onProgress: input.onProgress } : {}),
        ...(input.signal ? { signal: input.signal } : {}),
      };

      if (input.signal?.aborted) {
        reject(new AnalysisWorkerClientError('CANCELLED'));
        return;
      }

      const abortHandler = (): void => {
        this.cancelJob(activeJob);
      };
      activeJob.abortHandler = abortHandler;
      input.signal?.addEventListener('abort', abortHandler, { once: true });

      this.activeJob = activeJob;
      this.worker.postMessage(request);
    });
  }

  terminate(): void {
    this.cancelActiveJob();
    this.detachWorkerListeners();
    this.worker.terminate();
  }

  private readonly handleMessage: EventListener = (event): void => {
    if (!(event instanceof MessageEvent)) {
      return;
    }

    const responseResult = validateWorkerResponse(event.data);
    if (!responseResult.ok) {
      return;
    }

    const response = responseResult.value;
    const activeJob = this.activeJob;
    if (!activeJob || activeJob.settled || response.jobId !== activeJob.jobId) {
      return;
    }

    if (response.type === 'PROGRESS') {
      activeJob.onProgress?.(response);
      return;
    }

    if (response.type === 'RESULT') {
      this.resolveJob(activeJob, response.payload);
      return;
    }

    if (response.type === 'CANCELLED') {
      this.rejectJob(activeJob, 'CANCELLED');
      return;
    }

    this.rejectJob(activeJob, response.code);
  };

  private readonly handleCrash = (): void => {
    const activeJob = this.activeJob;
    if (!activeJob || activeJob.settled) {
      return;
    }

    if (activeJob.retriedAfterCrash) {
      this.rejectJob(activeJob, 'WORKER_INIT_FAILED');
      return;
    }

    activeJob.retriedAfterCrash = true;
    this.detachWorkerListeners();
    this.worker.terminate();
    this.worker = this.createWorker();
    this.attachWorkerListeners();
    this.worker.postMessage(activeJob.request);
  };

  private attachWorkerListeners(): void {
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleCrash);
  }

  private detachWorkerListeners(): void {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleCrash);
  }

  private cancelActiveJob(): void {
    if (this.activeJob && !this.activeJob.settled) {
      this.cancelJob(this.activeJob);
    }
  }

  private cancelJob(activeJob: ActiveJob): void {
    this.worker.postMessage({ type: 'CANCEL', jobId: activeJob.jobId });
    this.rejectJob(activeJob, 'CANCELLED');
  }

  private resolveJob(activeJob: ActiveJob, payload: AnalysisPayload): void {
    activeJob.settled = true;
    this.cleanupJob(activeJob);
    activeJob.resolve(payload);
  }

  private rejectJob(activeJob: ActiveJob, code: WorkerClientErrorCode): void {
    activeJob.settled = true;
    this.cleanupJob(activeJob);
    activeJob.reject(new AnalysisWorkerClientError(code));
  }

  private cleanupJob(activeJob: ActiveJob): void {
    if (activeJob.abortHandler) {
      activeJob.signal?.removeEventListener('abort', activeJob.abortHandler);
    }
    if (this.activeJob === activeJob) {
      this.activeJob = undefined;
    }
  }
}

function createBrowserWorker(): WorkerLike {
  return new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
}

function toWorkerComment(comment: RawComment): RawComment {
  return {
    id: comment.id,
    text: comment.text,
    likeCount: comment.likeCount,
    publishedAt: comment.publishedAt,
  };
}
