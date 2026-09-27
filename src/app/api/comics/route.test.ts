vi.mock("@/lib/server-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server-auth")>()),
  requireUser: vi.fn(async () => ({ user: { id: "parent", is_anonymous: false }, db: {} })),
  requirePair: vi.fn(),
}));
vi.mock("@/lib/pairing", () => ({ limitRequest: vi.fn(async () => {}) }));
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { makeComic } from "@/lib/ai/pipeline";
import { requireUser, requirePair, ApiError } from "@/lib/server-auth";

vi.mock("@/lib/ai/pipeline", () => ({ makeComic: vi.fn(async () => {}) }));
beforeEach(() => vi.mocked(makeComic).mockClear());
function request(extra: Record<string, string> = {}) {
  const form = new FormData();
  Object.entries({ text: "Today I found a rock.", panelCount: "2", ...extra }).forEach(
    ([key, value]) => form.set(key, value),
  );
  return new Request("http://localhost/api/comics", { method: "POST", body: form });
}
it("requires the avatar before spending an AI call", async () => {
  expect((await POST(request())).status).toBe(400);
  expect(makeComic).not.toHaveBeenCalled();
});
it("rejects arbitrary remote reference URLs", async () => {
  expect((await POST(request({ reference: "http://localhost/private" }))).status).toBe(400);
  expect(makeComic).not.toHaveBeenCalled();
});
it("rejects more than four sticker panels before calling the provider", async () => {
  expect(
    (await POST(request({ reference: "data:image/png;base64,YQ==", panelCount: "5" }))).status,
  ).toBe(400);
  expect(makeComic).not.toHaveBeenCalled();
});
it("passes valid text and avatar data into generation", async () => {
  const response = await POST(request({ reference: "data:image/png;base64,YQ==" }));
  expect(response.status).toBe(200);
  expect(makeComic).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "text",
      reference: "data:image/png;base64,YQ==",
      panelCount: 2,
    }),
    expect.any(Function),
  );
});

it("accepts a recording without client transcription and forwards its original bytes", async () => {
  const form = new FormData();
  form.set("reference", "data:image/png;base64,YQ==");
  form.set("panelCount", "3");
  form.set("audio", new Blob(["original recording"], { type: "audio/mp4" }), "story.m4a");
  const response = await POST(
    new Request("http://localhost/api/comics", { method: "POST", body: form }),
  );
  expect(response.status).toBe(200);
  const input = vi.mocked(makeComic).mock.calls[0][0];
  expect(input.kind).toBe("audio");
  if (input.kind !== "audio") throw new Error("Expected audio input");
  expect(input.filename).toBe("story.m4a");
  expect(await input.audio.text()).toBe("original recording");
  expect(input).not.toHaveProperty("text");
});

it("rejects unauthenticated generation before calling the provider", async () => {
  vi.mocked(requireUser).mockRejectedValueOnce(new ApiError(401, "Sign in"));
  expect((await POST(request())).status).toBe(401);
  expect(makeComic).not.toHaveBeenCalled();
});

/** A db whose family_members lookup returns `member`. */
function familyDb(member: { avatar_reference: string | null; language?: string } | null) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: member, error: null }),
  };
  return { from: () => query };
}

it("uses the paired child's saved avatar instead of a supplied reference", async () => {
  vi.mocked(requireUser).mockResolvedValueOnce({
    user: { id: "child", is_anonymous: true },
    db: familyDb(null),
  } as unknown as Awaited<ReturnType<typeof requireUser>>);
  vi.mocked(requirePair).mockResolvedValueOnce({
    child_id: "child",
    child_avatar_reference: "data:image/png;base64,Yg==",
  } as Awaited<ReturnType<typeof requirePair>>);
  const response = await POST(
    request({
      pairId: "11111111-1111-4111-8111-111111111111",
      reference: "data:image/png;base64,YQ==",
    }),
  );
  expect(response.status).toBe(200);
  expect(makeComic).toHaveBeenCalledWith(
    expect.objectContaining({
      reference: "data:image/png;base64,Yg==",
    }),
    expect.any(Function),
  );
});

it("prefers the child avatar from family_members over the pair's copy", async () => {
  vi.mocked(requireUser).mockResolvedValueOnce({
    user: { id: "child", is_anonymous: true },
    db: familyDb({ avatar_reference: "data:image/png;base64,Zg==" }),
  } as unknown as Awaited<ReturnType<typeof requireUser>>);
  vi.mocked(requirePair).mockResolvedValueOnce({
    child_id: "child",
    child_avatar_reference: "data:image/png;base64,Yg==",
  } as Awaited<ReturnType<typeof requirePair>>);
  const response = await POST(request({ pairId: "11111111-1111-4111-8111-111111111111" }));
  expect(response.status).toBe(200);
  expect(makeComic).toHaveBeenCalledWith(
    expect.objectContaining({ reference: "data:image/png;base64,Zg==" }),
    expect.any(Function),
  );
});

it("passes the parent's language through to transcription", async () => {
  const form = new FormData();
  form.set("panelCount", "1");
  form.set("reference", "data:image/png;base64,YQ==");
  form.set("language", "hi");
  form.set("audio", new Blob(["x"], { type: "audio/webm" }));
  const response = await POST(
    new Request("http://localhost/api/comics", { method: "POST", body: form }),
  );
  expect(response.status).toBe(200);
  expect(makeComic).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "audio", language: "hi" }),
    expect.any(Function),
  );
});

it("rejects a language the app doesn't offer", async () => {
  const response = await POST(request({ reference: "data:image/png;base64,YQ==", language: "xx" }));
  expect(response.status).toBe(400);
  expect(makeComic).not.toHaveBeenCalled();
});

it("uses the child's language from family_members, not the device's", async () => {
  vi.mocked(requireUser).mockResolvedValueOnce({
    user: { id: "child", is_anonymous: true },
    db: familyDb({ avatar_reference: "data:image/png;base64,Zg==", language: "ja" }),
  } as unknown as Awaited<ReturnType<typeof requireUser>>);
  vi.mocked(requirePair).mockResolvedValueOnce({
    child_id: "child",
    child_avatar_reference: null,
  } as unknown as Awaited<ReturnType<typeof requirePair>>);
  const form = new FormData();
  form.set("panelCount", "1");
  form.set("pairId", "11111111-1111-4111-8111-111111111111");
  form.set("language", "fr");
  form.set("audio", new Blob(["x"], { type: "audio/webm" }));
  const response = await POST(
    new Request("http://localhost/api/comics", { method: "POST", body: form }),
  );
  expect(response.status).toBe(200);
  expect(makeComic).toHaveBeenCalledWith(
    expect.objectContaining({ language: "ja" }),
    expect.any(Function),
  );
});
