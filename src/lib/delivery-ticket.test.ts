import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentHash, readDelivery, signDelivery } from "./delivery-ticket";
import { deliverySchema, deliveryFiles } from "@/features/messages/contract";
const media = { sha256: "a".repeat(64), size: 10, type: "image/png" };
const input = deliverySchema.parse({
  id: "10000000-0000-4000-8000-000000000001",
  pairId: "20000000-0000-4000-8000-000000000001",
  title: "A rock",
  transcript: "I found a rock.",
  originalTranscript: null,
  audioDurationMs: null,
  panelCount: 3,
  comic: media,
  print: media,
  audio: null,
});
beforeEach(() => vi.stubEnv("SUPABASE_SECRET_KEY", "test-only-secret"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("signed delivery", () => {
  it("binds the uploaded files and transcript to a user", () => {
    const ticket = signDelivery(input, "parent");
    expect(readDelivery(ticket, "parent")).toEqual(input);
    expect(() => readDelivery(ticket, "stranger")).toThrow();
  });
  it("rejects tampering", () => {
    const ticket = signDelivery(input, "parent");
    const [body, sig] = ticket.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    payload.input.pairId = "other";
    expect(() =>
      readDelivery(
        Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + sig,
        "parent",
      ),
    ).toThrow();
  });
  it("expires after fifteen minutes", () => {
    vi.useFakeTimers();
    const ticket = signDelivery(input, "parent");
    vi.advanceTimersByTime(16 * 60000);
    expect(() => readDelivery(ticket, "parent")).toThrow();
  });
  it("changes idempotency digest when content or target changes", () => {
    expect(contentHash({ ...input, transcript: "Something else" })).not.toBe(contentHash(input));
    expect(contentHash({ ...input, pairId: "other" })).not.toBe(contentHash(input));
  });
  it("uses message-scoped immutable paths", () => {
    expect(deliveryFiles(input).map((f) => f.path)).toEqual([
      `${input.pairId}/${input.id}/comic.png`,
      `${input.pairId}/${input.id}/print.png`,
    ]);
  });
  it("requires text and rejects audio metadata without a recording", () => {
    expect(deliverySchema.safeParse({ ...input, transcript: "" }).success).toBe(false);
    expect(deliverySchema.safeParse({ ...input, originalTranscript: "voice" }).success).toBe(false);
  });
});
