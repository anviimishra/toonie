/**
 * Everything an avatar can be made of. Each list is small on purpose: every
 * combination has to look good, and a child should be able to take in a whole
 * row of choices at a glance.
 *
 * The first entry of each list is the fallback when a stored value is unknown.
 */

export const SKIN_TONES = [
  { value: "porcelain", label: "Porcelain", fill: "#FFE6D5", shade: "#F2C2A4" },
  { value: "peach", label: "Peach", fill: "#FBCFAC", shade: "#E7A97F" },
  { value: "honey", label: "Honey", fill: "#E8AE80", shade: "#CC8A5B" },
  { value: "caramel", label: "Caramel", fill: "#C98B5D", shade: "#A96C42" },
  { value: "cocoa", label: "Cocoa", fill: "#9A6341", shade: "#7B4A2E" },
  { value: "espresso", label: "Espresso", fill: "#6E452C", shade: "#55331F" },
] as const;

export const HAIR_STYLES = [
  { value: "short", label: "Short" },
  { value: "curly", label: "Curly" },
  { value: "long", label: "Long" },
  { value: "bun", label: "Bun" },
  { value: "spiky", label: "Spiky" },
  { value: "pigtails", label: "Pigtails" },
] as const;

export const HAIR_COLORS = [
  { value: "black", label: "Black", fill: "#34282A", shade: "#211819" },
  { value: "brown", label: "Brown", fill: "#7A4A2A", shade: "#5A341C" },
  { value: "blonde", label: "Blonde", fill: "#F4C95D", shade: "#D9A63A" },
  { value: "ginger", label: "Ginger", fill: "#E0692F", shade: "#B94E1E" },
  { value: "pink", label: "Pink", fill: "#F48BB8", shade: "#D9639A" },
  { value: "blue", label: "Blue", fill: "#5E8FF0", shade: "#3F6ED0" },
] as const;

/** Backdrop colours, each paired with a shirt that sits well on it. */
export const BACKGROUNDS = [
  { value: "sunny", label: "Sunny", fill: "#FFD76E", shirt: "#F97316" },
  { value: "peach", label: "Peach", fill: "#FFB894", shirt: "#E4577A" },
  { value: "mint", label: "Mint", fill: "#A3E6C8", shirt: "#2F9E7A" },
  { value: "sky", label: "Sky", fill: "#A6CFFF", shirt: "#4A6FD8" },
  { value: "lilac", label: "Lilac", fill: "#CDB8FF", shirt: "#8058D8" },
  { value: "rose", label: "Rose", fill: "#FFB0CA", shirt: "#E0527E" },
] as const;

export type SkinTone = (typeof SKIN_TONES)[number]["value"];
export type HairStyle = (typeof HAIR_STYLES)[number]["value"];
export type HairColor = (typeof HAIR_COLORS)[number]["value"];
export type Background = (typeof BACKGROUNDS)[number]["value"];

function lookup<T extends { value: string }>(list: readonly T[], value: string): T {
  return list.find((entry) => entry.value === value) ?? list[0];
}

export const skinTone = (value: string) => lookup(SKIN_TONES, value);
export const hairColor = (value: string) => lookup(HAIR_COLORS, value);
export const backgroundColor = (value: string) => lookup(BACKGROUNDS, value);
export const hairStyle = (value: string) => lookup(HAIR_STYLES, value);
