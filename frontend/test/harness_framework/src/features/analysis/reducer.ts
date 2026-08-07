import type { AnalysisReport, AnalysisState, AppError, VideoSummary } from '../../types/domain';

export const initialAnalysisState: AnalysisState = { status: 'idle', input: '' };

export type AnalysisAction =
  | { type: 'INPUT_CHANGED'; input: string }
  | { type: 'SUBMIT'; jobId: string; input: string }
  | { type: 'FETCH_VIDEO_STARTED'; jobId: string }
  | { type: 'VIDEO_FETCHED'; jobId: string; video: VideoSummary }
  | { type: 'COMMENTS_PROGRESS'; jobId: string; page: number; collectedCount: number }
  | { type: 'ANALYSIS_STARTED'; jobId: string; total: number }
  | { type: 'ANALYSIS_PROGRESS'; jobId: string; processed: number; total: number }
  | { type: 'BUILDING_REPORT_STARTED'; jobId: string }
  | { type: 'REPORT_READY'; jobId: string; report: AnalysisReport }
  | { type: 'EMPTY'; jobId: string; reason: 'no-comments' | 'insufficient-sample' }
  | { type: 'FAILED'; jobId: string; error: AppError }
  | { type: 'CANCELLED'; jobId: string };

const TERMINAL_STATUSES = new Set<AnalysisState['status']>(['success', 'partial-success', 'empty', 'error', 'cancelled']);

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  if (action.type === 'INPUT_CHANGED') {
    return state.status === 'idle' ? { status: 'idle', input: action.input } : state;
  }

  if (action.type === 'SUBMIT') {
    return { status: 'validating', jobId: action.jobId, input: action.input };
  }

  if (TERMINAL_STATUSES.has(state.status)) {
    return state;
  }

  if (!hasMatchingJob(state, action.jobId)) {
    return state;
  }

  switch (action.type) {
    case 'FETCH_VIDEO_STARTED':
      return state.status === 'validating' ? { status: 'fetching-video', jobId: state.jobId, input: state.input } : state;

    case 'VIDEO_FETCHED':
      return state.status === 'fetching-video'
        ? {
            status: 'fetching-comments',
            jobId: state.jobId,
            input: state.input,
            video: action.video,
            collectedCount: 0,
            page: 0,
          }
        : state;

    case 'COMMENTS_PROGRESS':
      return state.status === 'fetching-comments'
        ? { ...state, page: action.page, collectedCount: action.collectedCount }
        : state;

    case 'ANALYSIS_STARTED':
      return state.status === 'fetching-comments'
        ? {
            status: 'analyzing',
            jobId: state.jobId,
            input: state.input,
            video: state.video,
            processed: 0,
            total: action.total,
          }
        : state;

    case 'ANALYSIS_PROGRESS':
      return state.status === 'analyzing' ? { ...state, processed: action.processed, total: action.total } : state;

    case 'BUILDING_REPORT_STARTED':
      return state.status === 'analyzing'
        ? { status: 'building-report', jobId: state.jobId, input: state.input, video: state.video }
        : state;

    case 'REPORT_READY':
      return state.status === 'building-report'
        ? {
            status: action.report.collectionStatus === 'partial' ? 'partial-success' : 'success',
            input: state.input,
            report: action.report,
          }
        : state;

    case 'EMPTY':
      return {
        status: 'empty',
        input: state.input,
        jobId: state.jobId,
        reason: action.reason,
        ...(readVideo(state) ? { video: readVideo(state) } : {}),
      };

    case 'FAILED':
      return {
        status: 'error',
        input: state.input,
        error: action.error,
        ...(readVideo(state) ? { video: readVideo(state) } : {}),
      };

    case 'CANCELLED':
      return {
        status: 'cancelled',
        input: state.input,
        jobId: state.jobId,
        ...(readVideo(state) ? { video: readVideo(state) } : {}),
      };
  }
}

function hasMatchingJob(state: AnalysisState, jobId: string): state is Extract<AnalysisState, { jobId: string }> {
  return 'jobId' in state && state.jobId === jobId;
}

function readVideo(state: AnalysisState): VideoSummary | undefined {
  return 'video' in state ? state.video : undefined;
}
