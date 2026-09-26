import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
};

describe("env", () => {
  it("accepts valid public env", () => {
    expect(parsePublicEnv(base).NEXT_PUBLIC_SUPABASE_URL).toBe(base.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("names the missing variable", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("defaults IMAGE_PROVIDER to openai", () => {
    const env = parseServerEnv({ ...base, SUPABASE_SECRET_KEY: "s", OPENAI_API_KEY: "k" });
    expect(env.IMAGE_PROVIDER).toBe("openai");
  });

  it("requires server secrets", () => {
    expect(() => parseServerEnv(base)).toThrow(/SUPABASE_SECRET_KEY/);
  });
});
