import { describe, expect, it } from 'vitest';

import type { AnalysisReport, AnalysisState, AppError, VideoSummary } from '../../types/domain';
import { analysisReducer, initialAnalysisState } from './reducer';

describe('analysisReducer', () => {
  it('allows the documented happy-path transitions', () => {
    const video = makeVideo();
    const report = makeReport({ jobId: 'job-1', video });

    const validating = analysisReducer(initialAnalysisState, { type: 'SUBMIT', jobId: 'job-1', input: ' https://youtu.be/abc123_DEF- ' });
    expect(validating).toEqual({ status: 'validating', jobId: 'job-1', input: ' https://youtu.be/abc123_DEF- ' });

    const fetchingVideo = analysisReducer(validating, { type: 'FETCH_VIDEO_STARTED', jobId: 'job-1' });
    expect(fetchingVideo).toEqual({ status: 'fetching-video', jobId: 'job-1', input: validating.input });

    const fetchingComments = analysisReducer(fetchingVideo, { type: 'VIDEO_FETCHED', jobId: 'job-1', video });
    expect(fetchingComments).toEqual({
      status: 'fetching-comments',
      jobId: 'job-1',
      input: validating.input,
      video,
      collectedCount: 0,
      page: 0,
    });

    const withProgress = analysisReducer(fetchingComments, {
      type: 'COMMENTS_PROGRESS',
      jobId: 'job-1',
      page: 1,
      collectedCount: 30,
    });
    expect(withProgress).toMatchObject({ status: 'fetching-comments', page: 1, collectedCount: 30 });

    const analyzing = analysisReducer(withProgress, { type: 'ANALYSIS_STARTED', jobId: 'job-1', total: 30 });
    expect(analyzing).toEqual({ status: 'analyzing', jobId: 'job-1', input: validating.input, video, processed: 0, total: 30 });

    const analyzed = analysisReducer(analyzing, { type: 'ANALYSIS_PROGRESS', jobId: 'job-1', processed: 12, total: 30 });
    expect(analyzed).toMatchObject({ status: 'analyzing', processed: 12, total: 30 });

    const building = analysisReducer(analyzed, { type: 'BUILDING_REPORT_STARTED', jobId: 'job-1' });
    expect(building).toEqual({ status: 'building-report', jobId: 'job-1', input: validating.input, video });

    expect(analysisReducer(building, { type: 'REPORT_READY', jobId: 'job-1', report }).status).toBe('success');
  });

  it('routes partial reports, empty results, errors and cancellation to terminal states', () => {
    const video = makeVideo();
    const fetching = analysisReducer(
      analysisReducer({ status: 'validating', jobId: 'job-1', input: 'url' }, { type: 'FETCH_VIDEO_STARTED', jobId: 'job-1' }),
      { type: 'VIDEO_FETCHED', jobId: 'job-1', video },
    );
    const partialReport = makeReport({ jobId: 'job-1', video, collectionStatus: 'partial' });

    expect(analysisReducer(fetching, { type: 'EMPTY', jobId: 'job-1', reason: 'no-comments' })).toEqual({
      status: 'empty',
      input: 'url',
      jobId: 'job-1',
      reason: 'no-comments',
      video,
    });
    expect(analysisReducer(fetching, { type: 'CANCELLED', jobId: 'job-1' })).toEqual({
      status: 'cancelled',
      input: 'url',
      jobId: 'job-1',
      video,
    });
    expect(analysisReducer(fetching, { type: 'FAILED', jobId: 'job-1', error: makeError('COMMENTS_DISABLED') })).toMatchObject({
      status: 'error',
      video,
      error: { code: 'COMMENTS_DISABLED' },
    });
    const analyzing = analysisReducer(fetching, { type: 'ANALYSIS_STARTED', jobId: 'job-1', total: 10 });
    const building = analysisReducer(analyzing, { type: 'BUILDING_REPORT_STARTED', jobId: 'job-1' });
    expect(analysisReducer(building, { type: 'REPORT_READY', jobId: 'job-1', report: partialReport })).toMatchObject({
      status: 'partial-success',
      report: partialReport,
    });
  });

  it('ignores stale actions, illegal transitions and progress after terminal states', () => {
    const current: AnalysisState = { status: 'analyzing', jobId: 'current', input: 'url', video: makeVideo(), processed: 0, total: 30 };
    const success: AnalysisState = { status: 'success', input: 'url', report: makeReport({ jobId: 'current', video: makeVideo() }) };

    expect(analysisReducer(current, { type: 'ANALYSIS_PROGRESS', jobId: 'old', processed: 30, total: 30 })).toBe(current);
    expect(analysisReducer(current, { type: 'VIDEO_FETCHED', jobId: 'current', video: makeVideo() })).toBe(current);
    expect(analysisReducer(success, { type: 'ANALYSIS_PROGRESS', jobId: 'current', processed: 1, total: 1 })).toBe(success);
  });
});

function makeVideo(): VideoSummary {
  return {
    id: 'abc123_DEF-',
    title: '테스트 영상',
    channelTitle: 'Comment Lens',
  };
}

function makeError(code: AppError['code']): AppError {
  return {
    code,
    kind: code === 'COMMENTS_DISABLED' ? 'permission' : 'upstream',
    retryable: false,
    stage: 'fetching-comments',
    diagnosticId: `diag-${code}`,
  };
}

function makeReport(input: { jobId: string; video: VideoSummary; collectionStatus?: AnalysisReport['collectionStatus'] }): AnalysisReport {
  return {
    schemaVersion: 1,
    analysisVersion: 'comment-lens-rules@0.1.0',
    reportId: `report-${input.jobId}`,
    jobId: input.jobId,
    video: input.video,
    analyzedAt: '2026-08-07T00:00:00.000Z',
    sourceOrder: 'relevance',
    collectionStatus: input.collectionStatus ?? 'complete',
    warnings:
      input.collectionStatus === 'partial'
        ? [{ code: 'PARTIAL_COLLECTION', message: '댓글 일부만 수집됨', page: 2, collectedCount: 10, errorCode: 'NETWORK_ERROR' }]
        : [],
    collectedCount: 1,
    sampleSize: 1,
    excludedCounts: { duplicate: 0, spam: 0, 'too-short': 0, 'unsupported-language': 0, 'no-analyzable-text': 0 },
    sentimentCounts: { positive: 1, neutral: 0, negative: 0 },
    strengths: [],
    improvements: [],
    contentIdeas: [],
    comments: [
      {
        id: 'c-1',
        text: '좋아요',
        likeCount: 1,
        publishedAt: '2026-08-07T00:00:00.000Z',
        sentiment: 'positive',
        sentimentScore: 0.5,
        confidence: 0.8,
        language: 'ko',
        topics: ['content'],
        normalizedHash: 'hash-c-1',
      },
    ],
  };
}
