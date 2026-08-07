import type { AnalysisReport, AppError } from '../types/domain';
import { validateAnalysisReport } from '../types/domain';

export const REPORTS_STORAGE_KEY = 'comment-lens:reports:v1';
export const MAX_STORED_REPORTS = 5;

export type StorageErrorCode = 'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_CORRUPTED';

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: StorageResultError };

export interface StorageResultError {
  code: StorageErrorCode;
  retryable: false;
  message: string;
}

export interface QuarantinedReport {
  reason: 'invalid-json' | 'invalid-container' | 'invalid-report';
  reportId?: string;
  issues: string[];
}

export type ReportsReadResult =
  | { ok: true; value: AnalysisReport[]; quarantined: QuarantinedReport[] }
  | { ok: false; error: StorageResultError };

export interface ReportsStorage {
  readReports: () => ReportsReadResult;
  saveReport: (report: AnalysisReport) => StorageResult<AnalysisReport[]>;
  deleteReport: (reportId: string) => StorageResult<AnalysisReport[]>;
  clearReports: () => StorageResult<AnalysisReport[]>;
  subscribe: (listener: (result: ReportsReadResult) => void) => () => void;
}

export interface ReportsStorageOptions {
  storage?: Storage;
  events?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
}

export function createReportsStorage(options: ReportsStorageOptions = {}): ReportsStorage {
  const storage = options.storage ?? globalThis.localStorage;
  const events = options.events ?? globalThis.window;

  return {
    readReports: () => readReportsFromStorage(storage),
    saveReport: (report) => saveReportToStorage(storage, report),
    deleteReport: (reportId) => deleteReportFromStorage(storage, reportId),
    clearReports: () => clearReportsFromStorage(storage),
    subscribe: (listener) => subscribeReports(storage, events, listener),
  };
}

export function sanitizeReportForStorage(report: AnalysisReport): AnalysisReport {
  const evidenceIds = new Set(
    [...report.strengths, ...report.improvements, ...report.contentIdeas].flatMap((insight) => insight.evidenceCommentIds),
  );

  return {
    ...report,
    comments: report.comments.filter((comment) => evidenceIds.has(comment.id)),
  };
}

function readReportsFromStorage(storage: Storage): ReportsReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(REPORTS_STORAGE_KEY);
  } catch {
    return { ok: false, error: makeStorageError('STORAGE_UNAVAILABLE', '저장된 리포트에 접근할 수 없습니다.') };
  }

  if (raw === null) {
    return { ok: true, value: [], quarantined: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: true,
      value: [],
      quarantined: [{ reason: 'invalid-json', issues: ['stored reports JSON is invalid'] }],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: true,
      value: [],
      quarantined: [{ reason: 'invalid-container', issues: ['stored reports must be an array'] }],
    };
  }

  const reports: AnalysisReport[] = [];
  const quarantined: QuarantinedReport[] = [];
  for (const item of parsed) {
    const validated = validateAnalysisReport(item);
    if (validated.ok) {
      reports.push(validated.value);
    } else {
      quarantined.push({
        reason: 'invalid-report',
        reportId: getReportId(item),
        issues: validated.issues,
      });
    }
  }

  return {
    ok: true,
    value: sortReports(reports).slice(0, MAX_STORED_REPORTS),
    quarantined,
  };
}

function saveReportToStorage(storage: Storage, report: AnalysisReport): StorageResult<AnalysisReport[]> {
  const sanitized = sanitizeReportForStorage(report);
  const validation = validateAnalysisReport(sanitized);
  if (!validation.ok) {
    return { ok: false, error: makeStorageError('STORAGE_CORRUPTED', '저장할 리포트의 형식이 올바르지 않습니다.') };
  }

  const current = readReportsFromStorage(storage);
  if (!current.ok) {
    return current;
  }

  const withoutCurrent = current.value.filter((storedReport) => storedReport.reportId !== sanitized.reportId);
  const candidates = sortReports([sanitized, ...withoutCurrent]).slice(0, MAX_STORED_REPORTS);
  return writeReportsWithQuotaRetry(storage, candidates);
}

function deleteReportFromStorage(storage: Storage, reportId: string): StorageResult<AnalysisReport[]> {
  const current = readReportsFromStorage(storage);
  if (!current.ok) {
    return current;
  }

  const next = current.value.filter((report) => report.reportId !== reportId);
  return writeReports(storage, next);
}

function clearReportsFromStorage(storage: Storage): StorageResult<AnalysisReport[]> {
  try {
    storage.removeItem(REPORTS_STORAGE_KEY);
  } catch {
    return { ok: false, error: makeStorageError('STORAGE_UNAVAILABLE', '저장된 리포트를 삭제할 수 없습니다.') };
  }

  return { ok: true, value: [] };
}

function subscribeReports(
  storage: Storage,
  events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | undefined,
  listener: (result: ReportsReadResult) => void,
): () => void {
  if (!events) {
    return () => {
      return undefined;
    };
  }

  const handleStorage = (event: Event): void => {
    if (!isReportsStorageEvent(event)) {
      return;
    }
    listener(readReportsFromStorage(storage));
  };

  events.addEventListener('storage', handleStorage);

  return () => {
    events.removeEventListener('storage', handleStorage);
  };
}

function writeReportsWithQuotaRetry(storage: Storage, candidates: AnalysisReport[]): StorageResult<AnalysisReport[]> {
  const first = writeReports(storage, candidates);
  if (first.ok || first.error.code !== 'STORAGE_QUOTA_EXCEEDED') {
    return first;
  }

  const retriedCandidates = candidates.slice(0, Math.max(0, candidates.length - 1));
  return writeReports(storage, retriedCandidates);
}

function writeReports(storage: Storage, reports: AnalysisReport[]): StorageResult<AnalysisReport[]> {
  try {
    storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    return {
      ok: false,
      error: isQuotaExceededError(error)
        ? makeStorageError('STORAGE_QUOTA_EXCEEDED', '기기 저장 공간 제한으로 리포트를 저장하지 못했습니다.')
        : makeStorageError('STORAGE_UNAVAILABLE', '브라우저 저장소에 접근할 수 없습니다.'),
    };
  }

  return { ok: true, value: reports };
}

function sortReports(reports: AnalysisReport[]): AnalysisReport[] {
  return [...reports].sort((left, right) => Date.parse(right.analyzedAt) - Date.parse(left.analyzedAt));
}

function isReportsStorageEvent(event: Event): boolean {
  return 'key' in event && (event as StorageEvent).key === REPORTS_STORAGE_KEY;
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

function makeStorageError(code: StorageErrorCode, message: string): StorageResultError {
  return { code, retryable: false, message };
}

function getReportId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const reportId = (value as Partial<AnalysisReport>).reportId;
  return typeof reportId === 'string' ? reportId : undefined;
}

export function storageErrorToAppError(error: StorageResultError, stage: AppError['stage'] = 'success'): AppError {
  return {
    code: error.code,
    kind: 'storage',
    retryable: error.retryable,
    stage,
    diagnosticId: crypto.randomUUID(),
  };
}
