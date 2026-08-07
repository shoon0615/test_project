import { describe, expect, it } from 'vitest';

import { SETTINGS_STORAGE_KEY, createSettingsStorage } from './settings';

describe('settings storage', () => {
  it('roundtrips only the comment source order preference', () => {
    const storage = new MemoryStorage();
    const settings = createSettingsStorage({ storage });

    const unsafeInput = { sourceOrder: 'time' as const, apiKey: 'must-not-persist' };
    const saved = settings.saveSettings(unsafeInput);

    expect(saved).toMatchObject({ ok: true, value: { sourceOrder: 'time' } });
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({ sourceOrder: 'time' });
    expect(settings.readSettings()).toMatchObject({ ok: true, value: { sourceOrder: 'time' } });
  });

  it('falls back to relevance when settings are missing, corrupted, or blocked', () => {
    expect(createSettingsStorage({ storage: new MemoryStorage() }).readSettings()).toMatchObject({
      ok: true,
      value: { sourceOrder: 'relevance' },
    });

    expect(createSettingsStorage({ storage: new MemoryStorage({ [SETTINGS_STORAGE_KEY]: '{broken' }) }).readSettings()).toMatchObject({
      ok: true,
      value: { sourceOrder: 'relevance' },
      quarantined: true,
    });

    expect(createSettingsStorage({ storage: new ThrowingStorage(new Error('blocked')) }).readSettings()).toMatchObject({
      ok: false,
      error: { code: 'STORAGE_UNAVAILABLE' },
    });
  });
});

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, value);
    }
  }

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  constructor(private readonly error: unknown) {
    super();
  }

  override getItem(): string | null {
    throw this.error;
  }
}
