import { createLocalAvatars } from "./local";
import type { AvatarAdapter } from "./types";

export type { Avatar, AvatarAdapter, AvatarConfig, AvatarSource } from "./types";
export type { Background, HairColor, HairStyle, SkinTone } from "./options";
export type { AvatarPreset } from "./presets";
export type { PhotoCheck } from "./photo";
export {
  BACKGROUNDS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  backgroundColor,
  hairColor,
  hairStyle,
  skinTone,
} from "./options";
export {
  DEFAULT_AVATAR_CONFIG,
  configsEqual,
  isAvatarConfig,
  normalizeAvatar,
  normalizeConfig,
  randomConfig,
  sameAvatar,
} from "./config";
export { AVATAR_PRESETS, findPreset, matchingPreset, presetForSeed } from "./presets";
export { MAX_PHOTO_BYTES, checkPhoto } from "./photo";

/** Avatars stay on this browser; photo generation uses the server API. */
export const avatars: AvatarAdapter = createLocalAvatars();
