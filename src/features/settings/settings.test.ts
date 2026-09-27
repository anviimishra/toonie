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
    const valid = { parentLanguage: "hi", childLanguage: "es" } as const;
    expect(normalizeSettings(valid)).toEqual(valid);
  });

  it("fixes bad fields one by one", () => {
    expect(normalizeSettings({ parentLanguage: "klingon", childLanguage: "ja" })).toEqual({
      parentLanguage: "en",
      childLanguage: "ja",
    });
  });

  it.each([null, undefined, 42, "en", []])("falls back to defaults for %s", (value) => {
    expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("family_members migration", () => {
  it("allows exactly the languages the app offers", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.resolve(import.meta.dirname, "../../../supabase/migrations");
    const file = fs.readdirSync(dir).find((f) => f.endsWith("_family_members.sql"));
    const sql = fs.readFileSync(path.join(dir, file!), "utf8");
    const list = /language in \(([^)]*)\)/.exec(sql)![1];
    const codes = [...list.matchAll(/'([a-z]{2})'/g)].map((m) => m[1]);
    expect(codes).toEqual(LANGUAGES.map((l) => l.code));
  });
});
