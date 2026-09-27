import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  updates: [] as Record<string, unknown>[],
  make: vi.fn(),
}));
vi.mock("@/lib/ai/pipeline", () => ({ makeComic: mocks.make }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => ({
    storage: { from: () => ({ upload: mocks.upload }) },
    from: () => ({
      update: (value: Record<string, unknown>) => {
        mocks.updates.push(value);
        return { eq: () => ({ eq: async () => ({ error: null }) }) };
      },
    }),
  }),
}));
import { runComicJob } from "./comic-jobs";
const request = {
  kind: "text" as const,
  text: "I found a rock.",
  reference: "data:image/png;base64,YQ==",
  panelCount: 1,
};
beforeEach(() => {
  mocks.updates.length = 0;
  mocks.upload.mockReset();
  mocks.make.mockReset();
});
it("stores panel files before publishing a ready comic with captions", async () => {
  mocks.upload.mockResolvedValue({ error: null });
  mocks.make.mockImplementation(async (_input, emit) => {
    emit({ type: "transcribed", transcript: "I found a rock." });
    emit({ type: "panel", index: 0, imageUrl: "data:image/jpeg;base64,YQ==" });
    emit({
      type: "done",
      comic: {
        title: "A rock",
        transcript: "I found a rock.",
        readingVersion: 1,
        panels: [
          { scene: "Rock", caption: "I found Kevin!", imageUrl: "data:image/jpeg;base64,YQ==" },
        ],
      },
    });
  });
  await runComicJob("job", "owner", request);
  expect(mocks.upload).toHaveBeenCalledWith("owner/job/panel-0.jpg", expect.any(Buffer), {
    contentType: "image/jpeg",
    upsert: false,
  });
  expect(mocks.updates.at(-1)).toMatchObject({
    status: "ready",
    result: { panels: [{ caption: "I found Kevin!", imageUrl: "owner/job/panel-0.jpg" }] },
  });
});
it("never publishes ready when private image storage fails", async () => {
  mocks.upload.mockResolvedValue({ error: new Error("offline") });
  mocks.make.mockImplementation(async (_input, emit) => {
    emit({ type: "panel", index: 0, imageUrl: "data:image/jpeg;base64,YQ==" });
    emit({
      type: "done",
      comic: { panels: [{ caption: "Hi", imageUrl: "data:image/jpeg;base64,YQ==" }] },
    });
  });
  await runComicJob("job", "owner", request);
  expect(mocks.updates.some((value) => value.status === "ready")).toBe(false);
  expect(mocks.updates.at(-1)).toMatchObject({ status: "failed" });
});
