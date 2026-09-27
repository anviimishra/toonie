import { transcribe } from "./transcribe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeComic, parseScript } from "./pipeline";
import { xaiPost } from "./xai";
import type { ComicEvent } from "@/types";

vi.mock("./transcribe", () => ({
  transcribe: vi.fn(async () => ({ text: "I found a rock.", language: "en", duration: 2 })),
}));
vi.mock("./xai", async (original) => ({
  ...(await original<typeof import("./xai")>()),
  xaiPost: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  aiEnv: () => ({
    XAI_TEXT_MODEL: "text",
    XAI_IMAGE_MODEL: "image",
    XAI_TRANSCRIBE_MODEL: "voice",
  }),
}));
const reference = "data:image/png;base64,YQ==";
const script = {
  title: "Kevin the rock",
  cast: "Narrator from reference",
  panels: [{ scene: "Narrator finds a rock", caption: "I found Kevin." }],
};

beforeEach(() => {
  vi.mocked(xaiPost).mockReset();
  vi.mocked(transcribe).mockClear();
});
describe("comic pipeline", () => {
  it("sends the saved avatar as an image reference and emits a complete comic", async () => {
    vi.mocked(xaiPost)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(script) } }] })
      .mockResolvedValueOnce({ data: [{ b64_json: "YQ==" }] });
    const events: ComicEvent[] = [];
    await makeComic(
      {
        kind: "text",
        text: "I found Kevin the rock.",
        panelCount: 1,
        narrator: "pink hair, round glasses",
        reference,
      },
      (event) => events.push(event),
    );
    expect(xaiPost).toHaveBeenLastCalledWith(
      "/images/edits",
      expect.objectContaining({
        body: expect.objectContaining({
          image: { url: reference, type: "image_url" },
          prompt: expect.stringContaining("pink hair, round glasses"),
          response_format: "b64_json",
        }),
      }),
    );
    expect(events.map((event) => event.type)).toEqual(["transcribed", "scripted", "panel", "done"]);
  });
  it("does not report success if a panel fails", async () => {
    vi.mocked(xaiPost)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(script) } }] })
      .mockRejectedValueOnce(new Error("offline"));
    const events: ComicEvent[] = [];
    await makeComic({ kind: "text", text: "I found a rock.", panelCount: 1, reference }, (event) =>
      events.push(event),
    );
    expect(events.at(-1)?.type).toBe("error");
    expect(events.some((event) => event.type === "done")).toBe(false);
  });
  it("transcribes audio before scripting", async () => {
    vi.mocked(xaiPost)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(script) } }] })
      .mockResolvedValueOnce({ data: [{ b64_json: "YQ==" }] });
    const events: ComicEvent[] = [];
    await makeComic(
      {
        kind: "audio",
        audio: new Blob(["audio"], { type: "audio/webm" }),
        filename: "story.webm",
        panelCount: 1,
        reference,
      },
      (event) => events.push(event),
    );
    expect(xaiPost).toHaveBeenNthCalledWith(
      1,
      "/chat/completions",
      expect.objectContaining({
        body: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("I found a rock."),
            }),
          ]),
        }),
      }),
    );
    expect(events[0]).toEqual({ type: "transcribed", transcript: "I found a rock." });
    expect(events.at(-1)).toMatchObject({ type: "done", comic: { transcript: "I found a rock." } });
    expect(transcribe).toHaveBeenCalledWith(expect.any(Blob));
  });
  it("rejects invalid scripts and wrong panel counts", () => {
    expect(parseScript("bad JSON", 1)).toBeNull();
    expect(parseScript(JSON.stringify(script), 2)).toBeNull();
    expect(parseScript(JSON.stringify(script), 1)?.panels[0].caption).toBe("");
  });
});
