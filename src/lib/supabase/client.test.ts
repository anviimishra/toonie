import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliveriesChannel, resetSupabaseBrowser, supabaseBrowser } from "./client";

describe("supabaseBrowser", () => {
  beforeEach(() => {
    resetSupabaseBrowser();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetSupabaseBrowser();
  });

  it("builds a client from the public env alone", () => {
    expect(supabaseBrowser().from("deliveries")).toBeDefined();
  });

  it("reuses one client across calls", () => {
    expect(supabaseBrowser()).toBe(supabaseBrowser());
  });

  it("does not need the secret key", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(() => supabaseBrowser()).not.toThrow();
  });

  it("names a channel per capsule", () => {
    expect(deliveriesChannel("abc")).toBe("deliveries:abc");
  });
});
