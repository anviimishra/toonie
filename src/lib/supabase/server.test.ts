import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSupabaseServer, supabaseServer } from "./server";

function stubValidEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_x");
  vi.stubEnv("OPENAI_API_KEY", "sk-x");
}

describe("supabaseServer", () => {
  beforeEach(() => {
    resetSupabaseServer();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetSupabaseServer();
  });

  it("builds a client from the server env", () => {
    stubValidEnv();
    expect(supabaseServer().from("stories")).toBeDefined();
  });

  it("reuses one client across calls", () => {
    stubValidEnv();
    expect(supabaseServer()).toBe(supabaseServer());
  });

  it("names the missing secret rather than failing deep in a query", () => {
    stubValidEnv();
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(() => supabaseServer()).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("refuses to run in the browser, where the secret key must never reach", () => {
    stubValidEnv();
    vi.stubGlobal("window", {});
    expect(() => supabaseServer()).toThrow(/browser/i);
  });
});
