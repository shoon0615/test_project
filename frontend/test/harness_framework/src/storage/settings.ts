import type { SourceOrder } from '../types/domain';
import { SOURCE_ORDERS } from '../types/domain';
import type { StorageResult, StorageResultError } from './reports';

export const SETTINGS_STORAGE_KEY = 'comment-lens:settings:v1';

export interface UserSettings {
  sourceOrder: SourceOrder;
}

export type SettingsReadResult =
  | { ok: true; value: UserSettings; quarantined: boolean }
  | { ok: false; error: StorageResultError };

export interface SettingsStorage {
  readSettings: () => SettingsReadResult;
  saveSettings: (settings: { sourceOrder: SourceOrder }) => StorageResult<UserSettings>;
}

export interface SettingsStorageOptions {
  storage?: Storage;
}

const DEFAULT_SETTINGS: UserSettings = {
  sourceOrder: 'relevance',
};

export function createSettingsStorage(options: SettingsStorageOptions = {}): SettingsStorage {
  const storage = options.storage ?? globalThis.localStorage;

  return {
    readSettings: () => readSettingsFromStorage(storage),
    saveSettings: (settings) => saveSettingsToStorage(storage, settings),
  };
}

function readSettingsFromStorage(storage: Storage): SettingsReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return { ok: false, error: makeStorageError('STORAGE_UNAVAILABLE', '설정 저장소에 접근할 수 없습니다.') };
  }

  if (raw === null) {
    return { ok: true, value: DEFAULT_SETTINGS, quarantined: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: true, value: DEFAULT_SETTINGS, quarantined: true };
  }

  if (!isUserSettings(parsed)) {
    return { ok: true, value: DEFAULT_SETTINGS, quarantined: true };
  }

  return { ok: true, value: parsed, quarantined: false };
}

function saveSettingsToStorage(storage: Storage, settings: { sourceOrder: SourceOrder }): StorageResult<UserSettings> {
  const persisted: UserSettings = {
    sourceOrder: settings.sourceOrder,
  };

  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    return { ok: false, error: makeStorageError('STORAGE_UNAVAILABLE', '설정을 저장할 수 없습니다.') };
  }

  return { ok: true, value: persisted };
}

function isUserSettings(value: unknown): value is UserSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const sourceOrder = (value as Partial<UserSettings>).sourceOrder;
  return SOURCE_ORDERS.some((candidate) => candidate === sourceOrder);
}

function makeStorageError(code: StorageResultError['code'], message: string): StorageResultError {
  return { code, retryable: false, message };
}
