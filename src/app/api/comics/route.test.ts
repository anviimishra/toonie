import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { makeComic } from "@/lib/ai/pipeline";

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
