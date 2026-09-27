import { DEFAULT_LANGUAGE, isLanguage } from "./languages";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  sendLanguage: DEFAULT_LANGUAGE,
  receiveLanguage: DEFAULT_LANGUAGE,
};

/** Anything (e.g. old or hand-edited storage) → valid settings, field by field. */
export function normalizeSettings(value: unknown): Settings {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    sendLanguage: isLanguage(input.sendLanguage)
      ? input.sendLanguage
      : DEFAULT_SETTINGS.sendLanguage,
    receiveLanguage: isLanguage(input.receiveLanguage)
      ? input.receiveLanguage
      : DEFAULT_SETTINGS.receiveLanguage,
  };
}
