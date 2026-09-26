import { configsEqual } from "./config";
import type { AvatarConfig } from "./types";

export type AvatarPreset = {
  id: string;
  name: string;
  config: AvatarConfig;
};

/** Starter characters: a spread of looks so everyone finds a close match. */
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: "sunny",
    name: "Sunny",
    config: {
      skin: "peach",
      hair: "short",
      hairColor: "brown",
      glasses: false,
      background: "sunny",
    },
  },
  {
    id: "pip",
    name: "Pip",
    config: {
      skin: "porcelain",
      hair: "pigtails",
      hairColor: "ginger",
      glasses: false,
      background: "mint",
    },
  },
  {
    id: "milo",
    name: "Milo",
    config: { skin: "cocoa", hair: "curly", hairColor: "black", glasses: true, background: "sky" },
  },
  {
    id: "rosie",
    name: "Rosie",
    config: { skin: "honey", hair: "long", hairColor: "pink", glasses: false, background: "rose" },
  },
  {
    id: "kai",
    name: "Kai",
    config: {
      skin: "caramel",
      hair: "spiky",
      hairColor: "blue",
      glasses: false,
      background: "lilac",
    },
  },
  {
    id: "juno",
    name: "Juno",
    config: {
      skin: "espresso",
      hair: "bun",
      hairColor: "black",
      glasses: false,
      background: "peach",
    },
  },
  {
    id: "bea",
    name: "Bea",
    config: {
      skin: "porcelain",
      hair: "long",
      hairColor: "blonde",
      glasses: true,
      background: "sky",
    },
  },
  {
    id: "ziggy",
    name: "Ziggy",
    config: {
      skin: "honey",
      hair: "curly",
      hairColor: "ginger",
      glasses: false,
      background: "sunny",
    },
  },
];

export function findPreset(id: string): AvatarPreset | null {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? null;
}

/** The preset this config is exactly, if any (so its tile shows as chosen). */
export function matchingPreset(config: AvatarConfig): AvatarPreset | null {
  return AVATAR_PRESETS.find((preset) => configsEqual(preset.config, config)) ?? null;
}

/** A stable preset for any string: the same seed always gives the same one. */
export function presetForSeed(seed: string): AvatarPreset {
  let hash = 5381;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash * 33) ^ seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length];
}
