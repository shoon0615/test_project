import { useEffect, useMemo, useRef, useState } from 'react';

import type { AnalysisWorkerPort } from '../features/analysis/orchestrator';
import { useAnalysisOrchestrator, type UseAnalysisOrchestratorResult } from '../features/analysis/useAnalysisOrchestrator';
import { parseYouTubeUrl } from '../features/youtube/url';
import { createReportsStorage, type ReportsReadResult } from '../storage/reports';
import type { AnalysisReport, AnalysisState, AppErrorCode, SourceOrder, VideoSummary } from '../types/domain';

const MAX_URL_LENGTH = 2_048;
const PROGRESS_STEPS: { status: AnalysisState['status']; label: string }[] = [
  { status: 'validating', label: 'URL 확인' },
  { status: 'fetching-video', label: '영상 확인' },
  { status: 'fetching-comments', label: '댓글 수집' },
  { status: 'analyzing', label: '반응 분석' },
  { status: 'building-report', label: '리포트 작성' },
];

export interface AppViewProps {
  analysis: UseAnalysisOrchestratorResult;
  recentReports: AnalysisReport[];
  apiKeyConfigured: boolean;
}

export function App() {
  const reportsStorage = useMemo(() => createReportsStorage(), []);
  const workerFallback = useMemo(() => createWorkerFallback(), []);
  const analysis = useAnalysisOrchestrator({ storage: reportsStorage, ...(workerFallback ? { worker: workerFallback } : {}) });
  const [recentReports, setRecentReports] = useState<AnalysisReport[]>(() => readRecentReports(reportsStorage.readReports()));

  useEffect(() => {
    return reportsStorage.subscribe((result) => {
      setRecentReports(readRecentReports(result));
    });
  }, [reportsStorage]);

  useEffect(() => {
    if (analysis.state.status === 'success' || analysis.state.status === 'partial-success') {
      setRecentReports(readRecentReports(reportsStorage.readReports()));
    }
  }, [analysis.state, reportsStorage]);

  return (
    <AppView
      analysis={analysis}
      apiKeyConfigured={isApiKeyConfigured(import.meta.env.VITE_YOUTUBE_API_KEY)}
      recentReports={recentReports}
    />
  );
}

export function AppView({ analysis, recentReports, apiKeyConfigured }: AppViewProps) {
  const { state, submit, cancel } = analysis;
  const [input, setInput] = useState(state.input);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(state.input);
  }, [state.input]);

  const currentVideo = readVideoFromState(state);
  const currentReport = selectedReport ?? readReportFromState(state);
  const canCancel = isRunningState(state);

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    const parsed = parseYouTubeUrl(trimmedInput);

    if (!parsed.ok) {
      setLocalError('지원하는 YouTube 영상 URL을 입력해 주세요. 예: https://www.youtube.com/watch?v=abc123_DEF-');
      inputRef.current?.focus();
      return;
    }

    if (!apiKeyConfigured) {
      setLocalError('운영 설정 오류로 분석을 시작할 수 없습니다. VITE_YOUTUBE_API_KEY 설정이 필요합니다.');
      inputRef.current?.focus();
      return;
    }

    setLocalError(undefined);
    setSelectedReport(undefined);
    void submit(trimmedInput, 'relevance');
  };

  return (
    <main className="min-h-screen bg-page text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-8">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <h1 className="text-xl font-semibold">Comment Lens</h1>
          <a className="text-sm font-medium text-muted" href="#recent-reports">
            최근 리포트
          </a>
        </header>

        <section className="max-w-3xl space-y-5" aria-labelledby="intro-title">
          <div className="space-y-3">
            <h2 id="intro-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
              댓글 300개를 읽는 대신, URL 하나로 핵심만 보세요.
            </h2>
            <p className="text-sm leading-7 text-body md:text-base">
              댓글과 분석 결과는 자체 서버로 보내지 않고 브라우저 안에서 처리하는 방향으로 구성됩니다.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row" aria-label="YouTube 댓글 분석" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="youtube-url">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              ref={inputRef}
              className="h-12 flex-1 rounded-md border border-[#CFCFC7] bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-brand"
              maxLength={MAX_URL_LENGTH}
              onChange={(event) => {
                setInput(event.currentTarget.value.slice(0, MAX_URL_LENGTH));
                setLocalError(undefined);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              value={input}
            />
            <button
              className="h-12 min-w-32 rounded-md bg-brand px-5 font-medium text-white hover:bg-[#B42318] disabled:opacity-50"
              disabled={canCancel}
              type="submit"
            >
              {buttonLabel(state)}
            </button>
          </form>
          {localError ? (
            <p className="rounded-md border border-[#C2413A] bg-white px-4 py-3 text-sm text-[#8A1F19]" role="alert">
              {localError}
            </p>
          ) : null}
        </section>

        {currentVideo ? <VideoSummaryPanel video={currentVideo} /> : null}

        <StatusPanel
          state={state}
          onCancel={cancel}
          onRetry={() => {
            void submit(state.input, readSourceOrder(state));
          }}
        />

        {currentReport ? <ReportPlaceholder report={currentReport} selected={selectedReport !== undefined} /> : null}

        <section id="recent-reports" className="space-y-3 text-sm" aria-labelledby="recent-title">
          <h2 id="recent-title" className="text-base font-semibold text-ink">
            최근 리포트
          </h2>
          {recentReports.length === 0 ? (
            <p className="text-muted" aria-live="polite">
              저장된 최근 리포트는 아직 없습니다.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recentReports.map((report) => (
                <li key={report.reportId} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-medium text-ink">{report.video.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {report.sampleSize}개 유효 댓글 · {formatOrder(report.sourceOrder)}
                  </p>
                  <button
                    className="mt-3 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    type="button"
                    onClick={() => {
                      setSelectedReport(report);
                    }}
                  >
                    {report.video.title} 열기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function VideoSummaryPanel({ video }: { video: VideoSummary }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 sm:flex-row" aria-label="영상 확인">
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-line bg-page text-sm text-muted sm:w-52">
        {video.thumbnailUrl && !imageFailed ? (
          <img
            alt={`${video.title} 썸네일`}
            className="h-full w-full object-cover"
            src={video.thumbnailUrl}
            onError={() => {
              setImageFailed(true);
            }}
          />
        ) : (
          <span>썸네일을 불러올 수 없음</span>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <h2 className="text-xl font-semibold">{video.title}</h2>
        <p className="text-sm text-body">{video.channelTitle}</p>
        {video.commentCount !== undefined ? <p className="text-xs text-muted">전체 댓글 수 근사치 {video.commentCount}개</p> : null}
      </div>
    </section>
  );
}

function StatusPanel({ state, onCancel, onRetry }: { state: AnalysisState; onCancel: () => void; onRetry: () => void }) {
  if (state.status === 'idle' || state.status === 'success' || state.status === 'partial-success') {
    return state.status === 'partial-success' ? <PartialWarning report={state.report} /> : null;
  }

  if (state.status === 'empty') {
    return (
      <section className="rounded-lg border border-line bg-white p-5" role="alert">
        <h2 className="text-base font-semibold">{state.reason === 'no-comments' ? '공개 댓글이 없습니다.' : '유효 표본이 부족합니다.'}</h2>
        <p className="mt-2 text-sm leading-6 text-body">
          {state.reason === 'no-comments'
            ? '분석할 수 있는 공개 최상위 댓글을 찾지 못했습니다. 다른 영상을 입력해 주세요.'
            : '유효 표본 10개 미만에서는 강점과 개선점 순위를 생성하지 않습니다.'}
        </p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="rounded-lg border border-[#C2413A] bg-white p-5" role="alert">
        <h2 className="text-base font-semibold">{errorTitle(state.error.code)}</h2>
        <p className="mt-2 text-sm leading-6 text-body">{errorMessage(state.error.code)}</p>
        {state.error.retryable ? (
          <button
            className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-[#B42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            type="button"
            onClick={onRetry}
          >
            다시 시도
          </button>
        ) : null}
        <details className="mt-4 text-xs text-muted">
          <summary>진단 정보</summary>
          <p className="mt-2">
            {state.error.code} · {state.error.stage} · {state.error.diagnosticId}
          </p>
        </details>
      </section>
    );
  }

  if (state.status === 'cancelled') {
    return (
      <section className="rounded-lg border border-line bg-white p-5" role="status" aria-live="polite">
        분석을 취소했습니다. 입력값은 유지됩니다.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5" role="status" aria-live="polite">
      <ol className="grid gap-2 text-sm sm:grid-cols-5">
        {PROGRESS_STEPS.map((step) => (
          <li
            key={step.status}
            className={`rounded-md border px-3 py-2 ${
              progressStepState(state.status, step.status) === 'current'
                ? 'border-brand bg-[#FFF4F2] font-semibold text-ink'
                : 'border-line text-muted'
            }`}
            aria-current={progressStepState(state.status, step.status) === 'current' ? 'step' : undefined}
          >
            {step.label}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-body">{statusDetail(state)}</p>
      <button
        className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        type="button"
        onClick={onCancel}
      >
        취소
      </button>
    </section>
  );
}

function PartialWarning({ report }: { report: AnalysisReport }) {
  const warning = report.warnings.find((candidate) => candidate.code === 'PARTIAL_COLLECTION');

  return (
    <section className="rounded-lg border border-[#2563A6] bg-white p-5" role="alert">
      <h2 className="text-base font-semibold">댓글 일부만 수집됨</h2>
      <p className="mt-2 text-sm leading-6 text-body">
        {warning?.collectedCount ?? report.collectedCount}개 댓글 기준의 부분 결과입니다. 전체 댓글을 대표하지 않을 수 있습니다.
      </p>
    </section>
  );
}

function ReportPlaceholder({ report, selected }: { report: AnalysisReport; selected: boolean }) {
  return (
    <section className="max-w-3xl space-y-3" aria-label={selected ? '저장된 리포트' : '분석 결과'}>
      <p className="text-xs font-medium text-muted">{selected ? '저장된 리포트' : '분석 결과'}</p>
      <h2 className="text-xl font-semibold">{report.video.title}</h2>
      <p className="text-sm leading-6 text-body">
        수집 {report.collectedCount}개 · 유효 {report.sampleSize}개 · {formatOrder(report.sourceOrder)}
      </p>
      <p className="rounded-lg border border-line bg-white p-5 text-sm text-muted">상세 리포트는 다음 단계에서 표시됩니다.</p>
    </section>
  );
}

function readRecentReports(result: ReportsReadResult): AnalysisReport[] {
  return result.ok ? result.value : [];
}

function isApiKeyConfigured(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRunningState(state: AnalysisState): boolean {
  return (
    state.status === 'validating' ||
    state.status === 'fetching-video' ||
    state.status === 'fetching-comments' ||
    state.status === 'analyzing' ||
    state.status === 'building-report'
  );
}

function readVideoFromState(state: AnalysisState): VideoSummary | undefined {
  if ('video' in state) {
    return state.video;
  }
  if ('report' in state) {
    return state.report.video;
  }
  return undefined;
}

function readReportFromState(state: AnalysisState): AnalysisReport | undefined {
  return 'report' in state ? state.report : undefined;
}

function readSourceOrder(state: AnalysisState): SourceOrder {
  return 'report' in state ? state.report.sourceOrder : 'relevance';
}

function buttonLabel(state: AnalysisState): string {
  if (state.status === 'fetching-comments') {
    return '댓글 가져오는 중';
  }
  if (state.status === 'analyzing') {
    return '반응 분석 중';
  }
  if (isRunningState(state)) {
    return '분석 준비 중';
  }
  return '분석하기';
}

function progressStepState(current: AnalysisState['status'], target: AnalysisState['status']): 'current' | 'other' {
  return current === target ? 'current' : 'other';
}

function statusDetail(state: AnalysisState): string {
  switch (state.status) {
    case 'validating':
      return '입력한 URL을 확인하고 있습니다.';
    case 'fetching-video':
      return '영상 정보를 확인하고 있습니다.';
    case 'fetching-comments':
      return `${String(state.page)}페이지까지 ${String(state.collectedCount)}개 수집`;
    case 'analyzing':
      return `${String(state.processed)}개 처리됨 / ${String(state.total)}개`;
    case 'building-report':
      return '근거 댓글과 통계를 확인해 리포트를 작성하고 있습니다.';
    default:
      return '';
  }
}

function errorTitle(code: AppErrorCode): string {
  if (code === 'API_KEY_MISSING' || code === 'API_KEY_INVALID' || code === 'API_KEY_RESTRICTED') {
    return '운영 설정 오류';
  }
  if (code === 'COMMENTS_DISABLED') {
    return '댓글 비활성화';
  }
  if (code === 'QUOTA_EXCEEDED') {
    return '할당량 소진';
  }
  return '분석할 수 없습니다';
}

function errorMessage(code: AppErrorCode): string {
  const messages: Record<AppErrorCode, string> = {
    INVALID_URL: '지원하는 YouTube 영상 URL을 입력해 주세요.',
    VIDEO_NOT_FOUND: '영상을 확인할 수 없습니다. URL을 확인하거나 다른 공개 영상을 입력해 주세요.',
    COMMENTS_DISABLED: '댓글이 비활성화된 영상입니다. 다른 영상을 입력해 주세요.',
    QUOTA_EXCEEDED: 'YouTube API 일일 할당량이 소진되었습니다. 자동 재시도는 하지 않습니다.',
    NETWORK_ERROR: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
    NO_COMMENTS: '공개 댓글이 없어 분석할 수 없습니다.',
    API_KEY_MISSING: '운영 설정 오류로 분석을 시작할 수 없습니다. API 키 설정이 필요합니다.',
    API_KEY_INVALID: '운영 설정 오류로 분석을 시작할 수 없습니다. API 키 상태를 확인해야 합니다.',
    API_KEY_RESTRICTED: '운영 설정 오류로 분석을 시작할 수 없습니다. 허용 도메인 설정을 확인해야 합니다.',
    API_FORBIDDEN: '영상 댓글에 접근할 수 없습니다. 키 설정 또는 접근 제한을 확인해야 합니다.',
    INVALID_API_REQUEST: '요청 형식이 올바르지 않습니다. 새 분석을 시작해 주세요.',
    UPSTREAM_PROCESSING_FAILURE: 'YouTube에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    RATE_LIMITED: '요청 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.',
    YOUTUBE_UNAVAILABLE: 'YouTube API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',
    CANCELLED: '분석을 취소했습니다.',
    REQUEST_TIMEOUT: '요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    PAGINATION_INVALID: '댓글 페이지 정보를 신뢰할 수 없어 수집을 중단했습니다. 새 분석을 시작해 주세요.',
    WORKER_INIT_FAILED: '브라우저 분석 작업을 시작하지 못했습니다. 지원 브라우저에서 다시 시도해 주세요.',
    ANALYSIS_FAILED: '댓글 분석 중 오류가 발생했습니다. 다시 시도해 주세요.',
    STORAGE_UNAVAILABLE: '브라우저 저장소에 접근할 수 없습니다. 현재 리포트는 화면에서만 확인할 수 있습니다.',
    STORAGE_QUOTA_EXCEEDED: '기기 저장 공간 제한으로 리포트를 저장하지 못했습니다.',
    STORAGE_CORRUPTED: '저장 데이터 형식이 올바르지 않습니다. 현재 분석은 계속 사용할 수 있습니다.',
    UNKNOWN_ERROR: '예상하지 못한 오류가 발생했습니다. 새 분석을 시작해 주세요.',
  };

  return messages[code];
}

function formatOrder(order: SourceOrder): string {
  return order === 'relevance' ? '관련도순' : '최신순';
}

function createWorkerFallback(): AnalysisWorkerPort | undefined {
  if (typeof Worker !== 'undefined') {
    return undefined;
  }

  return {
    analyze: () => Promise.reject(new Error('WORKER_UNAVAILABLE')),
    terminate: () => undefined,
  };
}
