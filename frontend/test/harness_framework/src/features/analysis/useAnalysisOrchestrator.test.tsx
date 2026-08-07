import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AnalysisPayload, RawComment, VideoSummary } from '../../types/domain';
import type { YouTubeApiAdapter } from '../youtube/api';
import type { AnalysisWorkerPort } from './orchestrator';
import { useAnalysisOrchestrator } from './useAnalysisOrchestrator';

describe('useAnalysisOrchestrator', () => {
  it('adapts the orchestrator to React state and cleans up the worker', async () => {
    const comments = makeRawComments();
    const terminate = vi.fn();
    const worker: AnalysisWorkerPort = {
      analyze: vi.fn<AnalysisWorkerPort['analyze']>().mockResolvedValue(makePayload(comments)),
      terminate,
    };

    const { result, unmount } = renderHook(() =>
      useAnalysisOrchestrator({
        youtube: makeAdapter(comments),
        worker,
        storage: { saveReport: vi.fn().mockReturnValue({ ok: true, value: [] }) },
        createJobId: () => 'job-hook',
        createReportId: () => 'report-hook',
        createDiagnosticId: () => 'diag-hook',
        now: () => '2026-08-07T00:00:00.000Z',
      }),
    );

    await act(async () => {
      await result.current.submit('https://youtu.be/abc123_DEF-');
    });

    expect(result.current.state).toMatchObject({ status: 'success', report: { jobId: 'job-hook', reportId: 'report-hook' } });

    unmount();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});

function makeAdapter(comments: RawComment[]): YouTubeApiAdapter {
  return {
    fetchVideo: vi.fn<YouTubeApiAdapter['fetchVideo']>().mockResolvedValue(makeVideo()),
    fetchComments: vi.fn<YouTubeApiAdapter['fetchComments']>().mockResolvedValue({ comments, collectionStatus: 'complete' }),
  };
}

function makeVideo(): VideoSummary {
  return {
    id: 'abc123_DEF-',
    title: '테스트 영상',
    channelTitle: 'Comment Lens',
  };
}

function makeRawComments(): RawComment[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `c-${String(index + 1)}`,
    text: '좋아요',
    likeCount: 0,
    publishedAt: '2026-08-07T00:00:00.000Z',
  }));
}

function makePayload(comments: RawComment[]): AnalysisPayload {
  return {
    comments: comments.map((comment) => ({
      ...comment,
      sentiment: 'positive',
      sentimentScore: 0.5,
      confidence: 0.8,
      language: 'ko',
      topics: ['content'],
      normalizedHash: `hash-${comment.id}`,
    })),
    sampleSize: comments.length,
    excludedCounts: { duplicate: 0, spam: 0, 'too-short': 0, 'unsupported-language': 0, 'no-analyzable-text': 0 },
    sentimentCounts: { positive: comments.length, neutral: 0, negative: 0 },
    strengths: [],
    improvements: [],
    contentIdeas: [],
  };
}
