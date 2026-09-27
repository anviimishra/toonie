import { DEFAULT_SETTINGS, normalizeSettings } from "./config";
import type { SettingsAdapter } from "./types";

/**
 * Stand-in settings for development: kept in localStorage until accounts are
 * real. The Settings screen goes through SettingsAdapter, so replacing this
 * file is the whole migration.
 */
const KEY = "toonie.settings";

export function createStubSettings(): SettingsAdapter {
  return {
    async get() {
      if (typeof window === "undefined") return DEFAULT_SETTINGS;
      try {
        return normalizeSettings(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
      } catch {
        return DEFAULT_SETTINGS;
      }
    },

    async save(settings) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(KEY, JSON.stringify(normalizeSettings(settings)));
    },
  };
}
