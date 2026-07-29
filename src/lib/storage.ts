import { isNative } from './capacitor';

/**
 * Unified storage abstraction.
 * Uses localStorage on web, and Capacitor Preferences on native.
 * Capacitor Preferences are loaded dynamically to avoid bundling
 * native code in web builds.
 */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      if (value === null) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }

    const value = localStorage.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: serialized });
      return;
    }

    localStorage.setItem(key, serialized);
  },

  async remove(key: string): Promise<void> {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    }

    localStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.clear();
      return;
    }

    localStorage.clear();
  },
};
