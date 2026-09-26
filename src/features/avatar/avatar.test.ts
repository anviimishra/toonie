import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVATAR_CONFIG,
  configsEqual,
  isAvatarConfig,
  normalizeAvatar,
  normalizeConfig,
  randomConfig,
  sameAvatar,
} from "./config";
import { BACKGROUNDS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "./options";
import { MAX_PHOTO_BYTES, checkPhoto } from "./photo";
import { AVATAR_PRESETS, findPreset, matchingPreset, presetForSeed } from "./presets";
import type { AvatarConfig } from "./types";

const milo: AvatarConfig = {
  skin: "cocoa",
  hair: "curly",
  hairColor: "black",
  glasses: true,
  background: "sky",
};

describe("normalizeConfig", () => {
  it("keeps a valid config as it is", () => {
    expect(normalizeConfig(milo)).toEqual(milo);
  });

  it.each([null, undefined, 42, "curly", [], [milo]])(
    "falls back to the default for %s",
    (input) => {
      expect(normalizeConfig(input)).toEqual(DEFAULT_AVATAR_CONFIG);
    },
  );

  it("replaces only the fields that are wrong", () => {
    expect(normalizeConfig({ ...milo, hair: "mohawk", glasses: "yes" })).toEqual({
      ...milo,
      hair: DEFAULT_AVATAR_CONFIG.hair,
      glasses: DEFAULT_AVATAR_CONFIG.glasses,
    });
  });

  it("drops unknown extra fields", () => {
    expect(normalizeConfig({ ...milo, hat: "wizard" })).toEqual(milo);
  });

  it("fills in missing fields", () => {
    expect(normalizeConfig({ skin: "espresso" })).toEqual({
      ...DEFAULT_AVATAR_CONFIG,
      skin: "espresso",
    });
  });
});

describe("isAvatarConfig", () => {
  it("accepts a complete, valid config", () => {
    expect(isAvatarConfig(milo)).toBe(true);
  });

  it.each([
    ["a missing field", { ...milo, background: undefined }],
    ["an unknown option", { ...milo, hairColor: "green" }],
    ["a non-boolean glasses", { ...milo, glasses: 1 }],
    ["a non-object", "milo"],
  ])("rejects %s", (_name, input) => {
    expect(isAvatarConfig(input)).toBe(false);
  });
});

describe("configsEqual and sameAvatar", () => {
  it("compares every field", () => {
    expect(configsEqual(milo, { ...milo })).toBe(true);
    expect(configsEqual(milo, { ...milo, glasses: false })).toBe(false);
  });

  it("treats a different photo as a different avatar", () => {
    const a = { source: "photo" as const, config: milo, photoDataUrl: "data:image/jpeg;base64,a" };
    expect(sameAvatar(a, { ...a })).toBe(true);
    expect(sameAvatar(a, { ...a, photoDataUrl: "data:image/jpeg;base64,b" })).toBe(false);
    expect(sameAvatar(a, { ...a, source: "preset" })).toBe(false);
  });
});

describe("randomConfig", () => {
  it("picks the first of everything at 0, with glasses", () => {
    expect(randomConfig(() => 0)).toEqual({
      skin: SKIN_TONES[0].value,
      hair: HAIR_STYLES[0].value,
      hairColor: HAIR_COLORS[0].value,
      glasses: true,
      background: BACKGROUNDS[0].value,
    });
  });

  it("never runs off the end of a list, even at 1", () => {
    const config = randomConfig(() => 1);
    expect(isAvatarConfig(config)).toBe(true);
    expect(config.skin).toBe(SKIN_TONES.at(-1)?.value);
    expect(config.glasses).toBe(false);
  });

  it("always makes a valid config", () => {
    for (let run = 0; run < 200; run += 1) {
      expect(isAvatarConfig(randomConfig())).toBe(true);
    }
  });
});

describe("normalizeAvatar", () => {
  it("keeps a valid photo avatar", () => {
    const avatar = {
      source: "photo",
      config: milo,
      photoDataUrl: "data:image/jpeg;base64,abc",
      imageUrl: "https://example.com/a.png",
    };
    expect(normalizeAvatar(avatar)).toEqual(avatar);
  });

  it.each([
    ["no source", { config: milo }],
    ["an unknown source", { source: "drawing", config: milo }],
    ["no config", { source: "preset" }],
    ["not an object", "avatar"],
    ["null", null],
  ])("returns null for %s", (_name, input) => {
    expect(normalizeAvatar(input)).toBeNull();
  });

  it("cleans a broken config instead of rejecting it", () => {
    expect(normalizeAvatar({ source: "preset", config: { ...milo, hair: 7 } })).toEqual({
      source: "preset",
      config: { ...milo, hair: DEFAULT_AVATAR_CONFIG.hair },
    });
  });

  it("drops photo and image URLs that aren't images", () => {
    const result = normalizeAvatar({
      source: "photo",
      config: milo,
      photoDataUrl: "javascript:alert(1)",
      imageUrl: "javascript:alert(1)",
    });
    expect(result).toEqual({ source: "photo", config: milo });
  });
});

describe("presets", () => {
  it("has 6 to 8 valid presets with unique ids", () => {
    expect(AVATAR_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(AVATAR_PRESETS.length).toBeLessThanOrEqual(8);
    expect(new Set(AVATAR_PRESETS.map((preset) => preset.id)).size).toBe(AVATAR_PRESETS.length);
    for (const preset of AVATAR_PRESETS) expect(isAvatarConfig(preset.config)).toBe(true);
  });

  it("has no two presets that look the same", () => {
    const looks = AVATAR_PRESETS.map((preset) => JSON.stringify(preset.config));
    expect(new Set(looks).size).toBe(looks.length);
  });

  it("finds a preset by id", () => {
    expect(findPreset("milo")?.config).toEqual(milo);
    expect(findPreset("nobody")).toBeNull();
  });

  it("recognises a config that is exactly a preset", () => {
    expect(matchingPreset({ ...milo })?.id).toBe("milo");
    expect(matchingPreset({ ...milo, glasses: false })).toBeNull();
  });

  it("gives the same preset for the same seed", () => {
    expect(presetForSeed("selfie.jpg:1234")).toBe(presetForSeed("selfie.jpg:1234"));
    expect(AVATAR_PRESETS).toContain(presetForSeed(""));
  });

  it("spreads different seeds across presets", () => {
    const ids = new Set(
      Array.from({ length: 50 }, (_, index) => presetForSeed(`photo-${index}`).id),
    );
    expect(ids.size).toBeGreaterThan(3);
  });
});

describe("checkPhoto", () => {
  it("accepts an image", () => {
    expect(checkPhoto({ type: "image/jpeg", size: 2_000_000 })).toEqual({ ok: true });
  });

  it.each([
    ["a non-image", { type: "application/pdf", size: 1000 }],
    ["an empty file", { type: "image/png", size: 0 }],
    ["a huge file", { type: "image/png", size: MAX_PHOTO_BYTES + 1 }],
  ])("rejects %s", (_name, file) => {
    expect(checkPhoto(file)).toMatchObject({ ok: false });
  });
});
