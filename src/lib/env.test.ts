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

  it("defaults the Grok models so only the key is required", () => {
    const env = parseServerEnv({ ...base, SUPABASE_SECRET_KEY: "s", XAI_API_KEY: "k" });
    expect(env.XAI_TEXT_MODEL).toBe("grok-4.7");
    expect(env.XAI_IMAGE_MODEL).toBe("grok-imagine-image-2.0");
    expect(env.XAI_TRANSCRIBE_MODEL).toBe("grok-voice-transcribe-2.0");
  });

  it("requires the xAI key", () => {
    expect(() => parseServerEnv({ ...base, SUPABASE_SECRET_KEY: "s" })).toThrow(/XAI_API_KEY/);
  });

  it("requires server secrets", () => {
    expect(() => parseServerEnv(base)).toThrow(/SUPABASE_SECRET_KEY/);
  });
});
