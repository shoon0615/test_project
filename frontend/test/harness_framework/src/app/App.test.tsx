import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App, AppView, type AppViewProps } from './App';
import type { AnalysisReport, AnalysisState, AppError, VideoSummary } from '../types/domain';
import { REPORT_SCHEMA_VERSION } from '../config/analysis';

describe('App', () => {
  it('renders the initial Comment Lens input screen without requiring an API key', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Comment Lens' })).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '분석하기' })).toBeInTheDocument();
    expect(screen.getByText('저장된 최근 리포트는 아직 없습니다.')).toBeInTheDocument();
  });

  it('submits only by Enter or button and never on paste', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    renderView({ analysis: makeAnalysis({ submit }) });

    const input = screen.getByLabelText('YouTube URL');
    await user.click(input);
    await user.paste('https://www.youtube.com/watch?v=abc123_DEF-');

    expect(submit).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123_DEF-', 'relevance');
  });

  it('focuses the input and shows a safe validation message for invalid URLs', async () => {
    const user = userEvent.setup();
    renderView({ analysis: makeAnalysis(), apiKeyConfigured: true });

    const input = screen.getByLabelText('YouTube URL');
    await user.click(input);
    await user.paste('https://example.com/watch?v=abc123_DEF-');
    await user.click(screen.getByRole('button', { name: '분석하기' }));

    expect(screen.getByRole('alert')).toHaveTextContent('지원하는 YouTube 영상 URL을 입력해 주세요.');
    expect(input).toHaveFocus();
  });

  it('limits input to 2,048 characters', () => {
    renderView({ analysis: makeAnalysis() });

    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'a'.repeat(2055) } });

    expect(input).toHaveValue('a'.repeat(2048));
  });

  it('shows configuration error before starting when the API key is missing', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    renderView({ analysis: makeAnalysis({ submit }), apiKeyConfigured: false });

    await user.click(screen.getByLabelText('YouTube URL'));
    await user.paste('https://www.youtube.com/watch?v=abc123_DEF-');
    await user.click(screen.getByRole('button', { name: '분석하기' }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('운영 설정 오류로 분석을 시작할 수 없습니다.');
    expect(screen.getByText('저장된 최근 리포트는 아직 없습니다.')).toBeInTheDocument();
  });

  it('renders video summary, five progress stages, aria-live status, and cancel action', async () => {
    const user = userEvent.setup();
    const cancel = vi.fn();
    renderView({
      analysis: makeAnalysis({
        cancel,
        state: {
          status: 'fetching-comments',
          jobId: 'job-1',
          input: 'https://youtu.be/abc123_DEF-',
          video: makeVideo({ thumbnailUrl: 'https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg' }),
          collectedCount: 42,
          page: 2,
        },
      }),
    });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('URL 확인')).toBeInTheDocument();
    expect(screen.getByText('영상 확인')).toBeInTheDocument();
    expect(screen.getByText('댓글 수집')).toBeInTheDocument();
    expect(screen.getByText('반응 분석')).toBeInTheDocument();
    expect(screen.getByText('리포트 작성')).toBeInTheDocument();
    expect(screen.getByText('테스트 영상')).toBeInTheDocument();
    expect(screen.getByText('2페이지까지 42개 수집')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('uses a thumbnail placeholder when the image fails', async () => {
    renderView({
      analysis: makeAnalysis({
        state: {
          status: 'fetching-comments',
          jobId: 'job-1',
          input: 'https://youtu.be/abc123_DEF-',
          video: makeVideo({ thumbnailUrl: 'https://i.ytimg.com/broken.jpg' }),
          collectedCount: 1,
          page: 1,
        },
      }),
    });

    fireEvent.error(screen.getByRole('img', { name: '테스트 영상 썸네일' }));

    expect(await screen.findByText('썸네일을 불러올 수 없음')).toBeInTheDocument();
  });

  it('renders empty, cancelled, error retry policy, and partial warning states', () => {
    const retry = vi.fn();
    const cancelState: AnalysisState = { status: 'cancelled', jobId: 'job-1', input: 'https://youtu.be/abc123_DEF-' };
    const emptyState: AnalysisState = { status: 'empty', jobId: 'job-1', input: 'https://youtu.be/abc123_DEF-', reason: 'no-comments' };
    const retryableErrorState: AnalysisState = {
      status: 'error',
      input: 'https://youtu.be/abc123_DEF-',
      error: makeError('NETWORK_ERROR', true),
    };
    const nonRetryableErrorState: AnalysisState = {
      status: 'error',
      input: 'https://youtu.be/abc123_DEF-',
      error: makeError('COMMENTS_DISABLED', false),
    };
    const partialState: AnalysisState = {
      status: 'partial-success',
      input: 'https://youtu.be/abc123_DEF-',
      report: makeReport({ collectionStatus: 'partial', warnings: [{ code: 'PARTIAL_COLLECTION', message: '댓글 일부만 수집됨', page: 2, collectedCount: 30, errorCode: 'NETWORK_ERROR' }] }),
    };

    const { rerender } = renderView({ analysis: makeAnalysis({ state: emptyState }) });
    expect(screen.getByRole('alert')).toHaveTextContent('공개 댓글이 없습니다.');

    rerender(<AppView {...makeViewProps({ analysis: makeAnalysis({ state: cancelState }) })} />);
    expect(screen.getByRole('status')).toHaveTextContent('분석을 취소했습니다.');

    rerender(<AppView {...makeViewProps({ analysis: makeAnalysis({ state: retryableErrorState, submit: retry }) })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();

    rerender(<AppView {...makeViewProps({ analysis: makeAnalysis({ state: nonRetryableErrorState }) })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('댓글이 비활성화된 영상입니다.');
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();

    rerender(<AppView {...makeViewProps({ analysis: makeAnalysis({ state: partialState }) })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('댓글 일부만 수집됨');
    expect(screen.getByText('상세 리포트는 다음 단계에서 표시됩니다.')).toBeInTheDocument();
  });

  it('shows and opens recent reports even when analysis cannot start', async () => {
    const user = userEvent.setup();
    renderView({
      apiKeyConfigured: false,
      recentReports: [makeReport({ reportId: 'stored-1', video: makeVideo({ title: '저장된 영상' }) })],
      analysis: makeAnalysis(),
    });

    await user.click(screen.getByRole('button', { name: '저장된 영상 열기' }));

    expect(screen.getAllByText('저장된 영상')).toHaveLength(2);
    expect(screen.getByText('저장된 리포트')).toBeInTheDocument();
  });
});

function renderView(props: Partial<AppViewProps> = {}) {
  return render(<AppView {...makeViewProps(props)} />);
}

function makeViewProps(props: Partial<AppViewProps> = {}): AppViewProps {
  return {
    analysis: makeAnalysis(),
    recentReports: [],
    apiKeyConfigured: true,
    ...props,
  };
}

function makeAnalysis(overrides: Partial<AppViewProps['analysis']> = {}): AppViewProps['analysis'] {
  return {
    state: { status: 'idle', input: '' },
    submit: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

function makeVideo(overrides: Partial<VideoSummary> = {}): VideoSummary {
  return {
    id: 'abc123_DEF-',
    title: '테스트 영상',
    channelTitle: '테스트 채널',
    commentCount: 120,
    ...overrides,
  };
}

function makeReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    analysisVersion: 'comment-lens-rules@0.1.0',
    reportId: 'report-1',
    jobId: 'job-1',
    video: makeVideo(),
    analyzedAt: '2026-08-07T00:00:00.000Z',
    sourceOrder: 'relevance',
    collectionStatus: 'complete',
    warnings: [],
    collectedCount: 1,
    sampleSize: 1,
    excludedCounts: {
      duplicate: 0,
      spam: 0,
      'too-short': 0,
      'unsupported-language': 0,
      'no-analyzable-text': 0,
    },
    sentimentCounts: {
      positive: 1,
      neutral: 0,
      negative: 0,
    },
    strengths: [],
    improvements: [],
    contentIdeas: [],
    comments: [makeComment()],
    ...overrides,
  };
}

function makeComment(overrides: Partial<AnalysisReport['comments'][number]> = {}): AnalysisReport['comments'][number] {
  return {
    id: 'comment-1',
    text: '좋아요',
    likeCount: 3,
    publishedAt: '2026-08-07T00:00:00.000Z',
    sentiment: 'positive',
    sentimentScore: 2,
    confidence: 0.8,
    language: 'ko',
    topics: [],
    normalizedHash: 'hash-1',
    ...overrides,
  };
}

function makeError(code: AppError['code'], retryable: boolean): AppError {
  return {
    code,
    kind: retryable ? 'network' : 'permission',
    retryable,
    stage: 'fetching-comments',
    diagnosticId: 'diag-1',
  };
}
