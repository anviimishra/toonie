import { DEFAULT_LANGUAGE, isLanguage } from "./languages";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  parentLanguage: DEFAULT_LANGUAGE,
  childLanguage: DEFAULT_LANGUAGE,
};

/** Anything (e.g. old or hand-edited storage) → valid settings, field by field. */
export function normalizeSettings(value: unknown): Settings {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    parentLanguage: isLanguage(input.parentLanguage)
      ? input.parentLanguage
      : DEFAULT_SETTINGS.parentLanguage,
    childLanguage: isLanguage(input.childLanguage)
      ? input.childLanguage
      : DEFAULT_SETTINGS.childLanguage,
  };
}
