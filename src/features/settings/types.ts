import type { LanguageCode } from "./languages";

/** A family's preferences. Avatars live in features/avatar. */
export type Settings = {
  /** The language stories are told in. */
  sendLanguage: LanguageCode;
  /** The language comics should arrive in. */
  receiveLanguage: LanguageCode;
};

/**
 * The seam between the Settings screen and wherever settings live.
 * Swap the stub for Supabase without touching a component.
 */
export interface SettingsAdapter {
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}
