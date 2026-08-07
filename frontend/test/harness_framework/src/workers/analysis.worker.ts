import { ANALYSIS_VERSION } from '../config/analysis';
import { buildAnalysisReport, type ReportBuilderComment } from '../features/report/build';
import { analyzeSentiment } from '../features/sentiment/analyze';
import { preprocessComments, type PreprocessedComment } from '../features/sentiment/preprocess';
import { analyzeTopics, type TopicAnalysisResult } from '../features/topics/analyze';
import { TOPIC_RULESET_VERSION } from '../features/topics/rules';
import type { AnalysisPayload, AnalysisStage, WorkerRequest, WorkerResponse } from '../types/domain';
import { validateWorkerRequest, validateWorkerResponse } from '../types/domain';

type EmitWorkerResponse = (message: WorkerResponse) => void;
type IsCancelled = (jobId: string) => boolean;

export function runAnalysisWorkerRequest(
  rawRequest: unknown,
  emit: EmitWorkerResponse,
  isCancelled: IsCancelled = () => false,
): void {
  const requestResult = validateWorkerRequest(rawRequest);
  if (!requestResult.ok) {
    emitIfValid(emit, { type: 'ERROR', jobId: readJobId(rawRequest), code: 'ANALYSIS_FAILED' });
    return;
  }

  const request = requestResult.value;
  if (request.type === 'CANCEL') {
    emitIfValid(emit, { type: 'CANCELLED', jobId: request.jobId });
    return;
  }

  try {
    if (request.configVersion !== ANALYSIS_VERSION) {
      throw new Error('analysis config version mismatch');
    }

    if (isCancelled(request.jobId)) {
      emitIfValid(emit, { type: 'CANCELLED', jobId: request.jobId });
      return;
    }

    const payload = buildAnalysisPayload(request, emit, isCancelled);
    if (isCancelled(request.jobId)) {
      emitIfValid(emit, { type: 'CANCELLED', jobId: request.jobId });
      return;
    }

    emitIfValid(emit, { type: 'RESULT', jobId: request.jobId, payload });
  } catch (error) {
    if (error instanceof CancelledAnalysisError) {
      emitIfValid(emit, { type: 'CANCELLED', jobId: request.jobId });
      return;
    }
    emitIfValid(emit, { type: 'ERROR', jobId: request.jobId, code: 'ANALYSIS_FAILED' });
  }
}

function buildAnalysisPayload(request: Extract<WorkerRequest, { type: 'ANALYZE' }>, emit: EmitWorkerResponse, isCancelled: IsCancelled): AnalysisPayload {
  emitProgress(emit, request.jobId, 'normalizing', 0, request.comments.length);
  throwIfCancelled(request.jobId, isCancelled);

  const preprocessed = preprocessComments(request.comments);
  emitProgress(emit, request.jobId, 'filtering', preprocessed.sampleSize, preprocessed.collectedCount);
  throwIfCancelled(request.jobId, isCancelled);

  const reportComments = scoreComments([...preprocessed.comments, ...preprocessed.excluded], request.jobId, emit, isCancelled);
  emitProgress(emit, request.jobId, 'building-payload', reportComments.length, reportComments.length);
  throwIfCancelled(request.jobId, isCancelled);

  const report = buildAnalysisReport({
    jobId: request.jobId,
    reportId: `worker-${request.jobId}`,
    analyzedAt: '1970-01-01T00:00:00.000Z',
    video: {
      id: 'worker-video',
      title: 'Worker analysis candidate',
      channelTitle: 'Comment Lens',
    },
    sourceOrder: 'relevance',
    collectionStatus: 'complete',
    comments: reportComments,
  });

  return {
    comments: report.comments,
    sampleSize: report.sampleSize,
    excludedCounts: report.excludedCounts,
    sentimentCounts: report.sentimentCounts,
    strengths: report.strengths,
    improvements: report.improvements,
    contentIdeas: report.contentIdeas,
  };
}

function scoreComments(
  comments: PreprocessedComment[],
  jobId: string,
  emit: EmitWorkerResponse,
  isCancelled: IsCancelled,
): ReportBuilderComment[] {
  const withSentiment: (PreprocessedComment & Pick<ReportBuilderComment, 'sentiment'>)[] = [];

  for (const [index, comment] of comments.entries()) {
    throwIfCancelled(jobId, isCancelled);
    withSentiment.push({
      ...comment,
      sentiment: comment.excludedReason ? { label: 'neutral', score: 0, confidence: 0, ruleHits: [] } : analyzeSentiment(comment),
    });
    emitProgress(emit, jobId, 'scoring-sentiment', index + 1, comments.length);
  }

  return withSentiment.map((comment, index) => {
    throwIfCancelled(jobId, isCancelled);
    const scoredComment = {
      ...comment,
      topics: comment.excludedReason ? emptyTopicResult() : analyzeTopics(comment),
    };
    emitProgress(emit, jobId, 'classifying-topics', index + 1, comments.length);
    return scoredComment;
  });
}

function emptyTopicResult(): TopicAnalysisResult {
  return {
    topics: [],
    intents: [],
    safetyFlags: [],
    confidence: 0,
    ruleHits: [],
    ruleSetVersion: TOPIC_RULESET_VERSION,
  };
}

function emitProgress(
  emit: EmitWorkerResponse,
  jobId: string,
  stage: AnalysisStage,
  processed: number,
  total: number,
): void {
  emitIfValid(emit, { type: 'PROGRESS', jobId, stage, processed, total });
}

function emitIfValid(emit: EmitWorkerResponse, message: WorkerResponse): void {
  const result = validateWorkerResponse(message);
  if (result.ok) {
    emit(result.value);
  }
}

function throwIfCancelled(jobId: string, isCancelled: IsCancelled): void {
  if (isCancelled(jobId)) {
    throw new CancelledAnalysisError();
  }
}

function readJobId(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'jobId' in value && typeof value.jobId === 'string') {
    return value.jobId;
  }

  return 'unknown-job';
}

class CancelledAnalysisError extends Error {}

interface WorkerScope {
  addEventListener?: (type: 'message', listener: (event: MessageEvent<unknown>) => void) => void;
  postMessage?: (message: WorkerResponse) => void;
}

const cancelledJobs = new Set<string>();
const workerScope = globalThis as WorkerScope;

if (typeof document === 'undefined' && typeof workerScope.addEventListener === 'function' && typeof workerScope.postMessage === 'function') {
  const scope = workerScope as Required<WorkerScope>;
  workerScope.addEventListener('message', (event) => {
    handleWorkerMessage(event.data, scope);
  });
}

function handleWorkerMessage(rawRequest: unknown, scope: Required<WorkerScope>): void {
  const requestResult = validateWorkerRequest(rawRequest);
  if (requestResult.ok && requestResult.value.type === 'CANCEL') {
    cancelledJobs.add(requestResult.value.jobId);
    scope.postMessage({ type: 'CANCELLED', jobId: requestResult.value.jobId });
    return;
  }

  if (requestResult.ok && requestResult.value.type === 'ANALYZE') {
    cancelledJobs.delete(requestResult.value.jobId);
  }

  runAnalysisWorkerRequest(
    rawRequest,
    (message) => {
      scope.postMessage(message);
    },
    (jobId) => cancelledJobs.has(jobId),
  );
}
