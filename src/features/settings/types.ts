import type { LanguageCode } from "./languages";

/**
 * Languages chosen on this tablet before a child device is connected. Once
 * connected, the shared copy lives in Supabase (family_members) instead.
 */
export type Settings = {
  /** The grown-up's language. */
  parentLanguage: LanguageCode;
  /** The child's language. */
  childLanguage: LanguageCode;
};

/**
 * The seam between the Settings screen and wherever local settings live.
 */
export interface SettingsAdapter {
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}
