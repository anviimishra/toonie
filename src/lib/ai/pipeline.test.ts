import { transcribe } from "./transcribe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeComic, parseScript } from "./pipeline";
import { xaiPost } from "./xai";
import { READING_PANEL_COUNT, type ComicEvent } from "@/types";

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
  it("transcribes a recording in the storyteller's language", async () => {
    vi.mocked(xaiPost)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(script) } }] })
      .mockResolvedValueOnce({ data: [{ b64_json: "YQ==" }] });
    const audio = new Blob(["x"], { type: "audio/webm" });
    await makeComic(
      { kind: "audio", audio, filename: "story.webm", panelCount: 1, reference, language: "es" },
      () => {},
    );
    expect(transcribe).toHaveBeenCalledWith(audio, { language: "es" });
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
    expect(transcribe).toHaveBeenCalledWith(expect.any(Blob), { language: undefined });
  });
  it("rejects invalid scripts and wrong panel counts", () => {
    expect(parseScript("bad JSON", 1)).toBeNull();
    expect(parseScript(JSON.stringify(script), 2)).toBeNull();
    expect(parseScript(JSON.stringify(script), 1)?.panels[0].caption).toBe("I found Kevin.");
    expect(
      parseScript(JSON.stringify({ ...script, panels: [{ scene: "Rock", caption: "" }] }), 1),
    ).toBeNull();
  });
});

function mockEditions(failSticker = false) {
  vi.mocked(xaiPost).mockImplementation(async (path, options) => {
    const body = options.body as Record<string, unknown>;
    if (path === "/chat/completions") {
      const prompt = (body.messages as { content: string }[])[0].content;
      const sticker = prompt.includes("wordless 2 inch");
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...script,
                panels: Array.from({ length: sticker ? 3 : READING_PANEL_COUNT }, (_, i) => ({
                  scene: `${sticker ? "Summary" : "Reading"} moment ${i}`,
                  caption: sticker ? "" : `Story moment ${i}`,
                  dialogue: sticker ? [] : [{ speaker: "Me", text: "Hello!" }],
                })),
              }),
            },
          },
        ],
      };
    }
    if (failSticker && String(body.prompt).includes("Summary moment")) throw new Error("offline");
    return { data: [{ b64_json: "YQ==" }] };
  });
}
it("scripts and draws a full reading comic independently from the wordless sticker", async () => {
  mockEditions();
  const events: ComicEvent[] = [];
  await makeComic(
    { kind: "text", text: "I found a rock.", reference, panelCount: 3, outputMode: "dual" },
    (e) => events.push(e),
  );
  const done = events.find((e) => e.type === "done");
  expect(done?.comic.panels).toHaveLength(READING_PANEL_COUNT);
  expect(done?.comic.stickerPanels).toHaveLength(3);
  expect(done?.comic.panels[0]).toMatchObject({
    scene: "Reading moment 0",
    dialogue: [{ speaker: "Me", text: "Hello!" }],
  });
  expect(done?.comic.stickerPanels?.[0]).toMatchObject({
    scene: "Summary moment 0",
    caption: "",
    dialogue: [],
  });
  const images = vi.mocked(xaiPost).mock.calls.filter((call) => call[0] === "/images/edits");
  expect(images).toHaveLength(READING_PANEL_COUNT + 3);
  images.forEach((call) => expect(call[1].body).toMatchObject({ image: { url: reference } }));
  expect(events.filter((e) => e.type === "panel" && e.edition === "reading")).toHaveLength(
    READING_PANEL_COUNT,
  );
  expect(events.filter((e) => e.type === "panel" && e.edition === "sticker")).toHaveLength(3);
});
it("child replies generate only the full reading comic", async () => {
  mockEditions();
  const events: ComicEvent[] = [];
  await makeComic(
    { kind: "text", text: "I found a rock.", reference, panelCount: 3, outputMode: "reading" },
    (e) => events.push(e),
  );
  expect(events.find((e) => e.type === "done")?.comic.panels).toHaveLength(READING_PANEL_COUNT);
  expect(events.find((e) => e.type === "done")?.comic.stickerPanels).toBeUndefined();
  expect(
    vi.mocked(xaiPost).mock.calls.filter((call) => call[0] === "/chat/completions"),
  ).toHaveLength(1);
  expect(vi.mocked(xaiPost).mock.calls.filter((call) => call[0] === "/images/edits")).toHaveLength(
    READING_PANEL_COUNT,
  );
});
it("cannot publish a parent comic if its separate sticker fails", async () => {
  mockEditions(true);
  const events: ComicEvent[] = [];
  await makeComic(
    { kind: "text", text: "I found a rock.", reference, panelCount: 3, outputMode: "dual" },
    (e) => events.push(e),
  );
  expect(events.at(-1)?.type).toBe("error");
  expect(events.some((e) => e.type === "done")).toBe(false);
});
