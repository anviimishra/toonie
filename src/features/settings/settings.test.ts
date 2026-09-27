import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./config";
import { LANGUAGES, isLanguage, languageLabel } from "./languages";

describe("languages", () => {
  it("has unique two-letter codes", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[a-z]{2}$/);
  });

  it("recognises supported codes only", () => {
    expect(isLanguage("es")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it("labels a language", () => {
    expect(languageLabel("fr")).toBe("Français");
  });
});

describe("normalizeSettings", () => {
  it("keeps valid settings", () => {
    const valid = { sendLanguage: "hi", receiveLanguage: "es" } as const;
    expect(normalizeSettings(valid)).toEqual(valid);
  });

  it("fixes bad fields one by one", () => {
    expect(normalizeSettings({ sendLanguage: "klingon", receiveLanguage: "ja" })).toEqual({
      sendLanguage: "en",
      receiveLanguage: "ja",
    });
  });

  it.each([null, undefined, 42, "en", []])("falls back to defaults for %s", (value) => {
    expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
  });
});
