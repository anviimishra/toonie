import { createStubSettings } from "./stub";
import type { SettingsAdapter } from "./types";

export type { Settings, SettingsAdapter } from "./types";
export type { LanguageCode } from "./languages";
export { DEFAULT_LANGUAGE, LANGUAGES, isLanguage, languageLabel } from "./languages";
export { DEFAULT_SETTINGS, normalizeSettings } from "./config";

/** The adapter the app uses. Swap this line for the real one. */
export const settings: SettingsAdapter = createStubSettings();
