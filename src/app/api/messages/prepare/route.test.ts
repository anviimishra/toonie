import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/pairing", () => ({ limitRequest: vi.fn() }));
vi.mock("@/lib/delivery-ticket", () => ({
  contentHash: vi.fn(),
  signDelivery: () => "signed-ticket",
}));
vi.mock("@/lib/server-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server-auth")>()),
  requireUser: async () => ({
    user: { id: "parent" },
    db: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
      storage: { from: () => ({ createSignedUploadUrl: upload }) },
    },
  }),
  requirePair: async () => ({ parent_id: "parent" }),
}));
import { POST } from "./route";
const media = { sha256: "a".repeat(64), size: 10, type: "image/png" };
function request() {
  return new Request("http://localhost/api/messages/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  });
}
beforeEach(() => upload.mockReset());
afterEach(() => vi.restoreAllMocks());
it("resumes partial uploads without overwriting existing objects", async () => {
  upload.mockResolvedValueOnce({ data: null, error: { message: "The resource already exists" } });
  upload.mockResolvedValueOnce({ data: { token: "print-token" }, error: null });
  const response = await POST(request());
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.ticket).toBe("signed-ticket");
  expect(body.uploads).toHaveLength(1);
  expect(body.uploads[0].key).toBe("print");
  expect(upload).toHaveBeenCalledWith(expect.any(String), { upsert: false });
});
it("does not treat other storage failures as uploaded files", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  upload.mockResolvedValue({ data: null, error: { message: "Storage unavailable" } });
  expect((await POST(request())).status).toBe(500);
});
