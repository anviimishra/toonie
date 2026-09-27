import { BACKGROUNDS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "./options";
import type { Avatar, AvatarConfig } from "./types";

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: "peach",
  hair: "short",
  hairColor: "brown",
  glasses: false,
  background: "sunny",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickValid<T extends string>(
  list: readonly { value: T }[],
  candidate: unknown,
  fallback: T,
): T {
  return list.some((entry) => entry.value === candidate) ? (candidate as T) : fallback;
}

/**
 * Turn anything (old localStorage, a server row, a half-built object) into a
 * config that can be drawn. Unknown or missing fields fall back to the default
 * one by one, so a single bad field never throws the whole avatar away.
 */
export function normalizeConfig(input: unknown): AvatarConfig {
  const raw = isRecord(input) ? input : {};
  const base = DEFAULT_AVATAR_CONFIG;
  return {
    skin: pickValid(SKIN_TONES, raw.skin, base.skin),
    hair: pickValid(HAIR_STYLES, raw.hair, base.hair),
    hairColor: pickValid(HAIR_COLORS, raw.hairColor, base.hairColor),
    glasses: typeof raw.glasses === "boolean" ? raw.glasses : base.glasses,
    background: pickValid(BACKGROUNDS, raw.background, base.background),
  };
}

/** True only when every field is present and valid. */
export function isAvatarConfig(input: unknown): input is AvatarConfig {
  if (!isRecord(input)) return false;
  const normalized = normalizeConfig(input);
  return (Object.keys(normalized) as (keyof AvatarConfig)[]).every(
    (key) => normalized[key] === input[key],
  );
}

export function configsEqual(a: AvatarConfig, b: AvatarConfig): boolean {
  return (
    a.skin === b.skin &&
    a.hair === b.hair &&
    a.hairColor === b.hairColor &&
    a.glasses === b.glasses &&
    a.background === b.background
  );
}

/** Same avatar in every way that matters to the screen. */
export function sameAvatar(a: Avatar, b: Avatar): boolean {
  return (
    a.source === b.source &&
    configsEqual(a.config, b.config) &&
    a.photoDataUrl === b.photoDataUrl &&
    a.imageUrl === b.imageUrl
  );
}

function pick<T>(list: readonly T[], rand: () => number): T {
  const index = Math.floor(rand() * list.length);
  return list[Math.min(list.length - 1, Math.max(0, index))];
}

/**
 * A random avatar for "Surprise me". Takes the random source as an argument
 * so tests can pin it.
 */
export function randomConfig(rand: () => number = Math.random): AvatarConfig {
  return {
    skin: pick(SKIN_TONES, rand).value,
    hair: pick(HAIR_STYLES, rand).value,
    hairColor: pick(HAIR_COLORS, rand).value,
    glasses: rand() < 0.3,
    background: pick(BACKGROUNDS, rand).value,
  };
}

const PHOTO_PREFIX = "data:image/";

function isImageUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("https://") || value.startsWith("http://") || value.startsWith(PHOTO_PREFIX))
  );
}

/**
 * Parse a stored avatar. Returns null when it can't be one (no config, or an
 * unknown source); otherwise cleans every field.
 */
export function normalizeAvatar(input: unknown): Avatar | null {
  if (!isRecord(input)) return null;
  if (input.source !== "photo" && input.source !== "preset") return null;
  if (!isRecord(input.config)) return null;

  const avatar: Avatar = { source: input.source, config: normalizeConfig(input.config) };
  if (typeof input.photoDataUrl === "string" && input.photoDataUrl.startsWith(PHOTO_PREFIX)) {
    avatar.photoDataUrl = input.photoDataUrl;
  }
  if (isImageUrl(input.imageUrl)) avatar.imageUrl = input.imageUrl;
  return avatar;
}
