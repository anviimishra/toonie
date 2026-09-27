import type { Background, HairColor, HairStyle, SkinTone } from "./options";

/** The recipe for a drawn avatar. Every field is one pick from ./options. */
export type AvatarConfig = {
  skin: SkinTone;
  hair: HairStyle;
  hairColor: HairColor;
  glasses: boolean;
  background: Background;
};

/** How the avatar was made: from a selfie, or built from the presets. */
export type AvatarSource = "photo" | "preset";

/**
 * The character that stars in every panel of someone's comics.
 *
 * `config` is always present, so there is always something to draw, even for
 * a photo avatar before the real image comes back.
 */
export type Avatar = {
  source: AvatarSource;
  config: AvatarConfig;
  /** A small copy of the selfie it was made from (photo avatars only). */
  photoDataUrl?: string;
  /** The drawn avatar from the image model, once there is one. */
  imageUrl?: string;
};

/**
 * The seam between the Me screen and wherever avatars actually live.
 *
 * The screen only knows this interface, so the real implementation (Supabase
 * storage plus Grok's image model) can land without touching a component.
 */
export interface AvatarAdapter {
  /** The saved avatar, or null if there isn't one yet. */
  get(): Promise<Avatar | null>;
  save(avatar: Avatar): Promise<void>;
  /** Turn a selfie into an avatar. Does not save it. */
  generateFromPhoto(file: File): Promise<Avatar>;
}
