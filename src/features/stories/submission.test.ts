import { describe, expect, it, vi } from "vitest";
import { READING_PANEL_COUNT } from "@/types";
import { prepareStory, submissionFormData, textSource } from "./submission";
const id = "00000000-0000-4000-8000-000000000001";
const comic = {
  format: "sticker" as const,
  title: "Rock Friend",
  transcript: "I found Kevin.",
  panels: [{ scene: "A rock", caption: "", imageUrl: "data:image/png;base64,YQ==" }],
};
const render = async () => new Blob(["png"], { type: "image/png" });
describe("delivery preparation", () => {
  it("retains original recording bytes and raw transcript alongside edited text", async () => {
    const audio = new Blob(["original audio"], { type: "audio/mp4" });
    const prepared = await prepareStory(
      id,
      comic,
      { kind: "voice", audio, durationMs: 2000, originalTranscript: "I found keven" },
      render,
    );
    const form = submissionFormData(prepared);
    expect(await (form.get("audio") as Blob).text()).toBe("original audio");
    expect((form.get("audio") as File).name).toBe(`${id}.m4a`);
    expect(JSON.parse(form.get("metadata") as string)).toMatchObject({
      title: "Rock Friend",
      transcript: "I found Kevin.",
      originalTranscript: "I found keven",
      source: "voice",
    });
    expect(form.get("comic_image")).toBeInstanceOf(Blob);
    expect(form.get("print_image")).toBeInstanceOf(Blob);
  });
  it("omits audio for typed stories", async () => {
    expect(
      submissionFormData(await prepareStory(id, comic, textSource(), render)).has("audio"),
    ).toBe(false);
  });
  it("rejects missing voice media instead of silently losing it", async () => {
    await expect(
      prepareStory(id, comic, { ...textSource(), kind: "voice" }, render),
    ).rejects.toThrow("recording is missing");
  });
  it("rejects incomplete comics", async () => {
    await expect(
      prepareStory(
        id,
        { ...comic, panels: [{ scene: "missing", caption: "" }] },
        textSource(),
        render,
      ),
    ).rejects.toThrow("Finish the sticker");
  });
});

vi.mock("./export-reading", () => ({
  renderReadingComic: vi.fn(async () => new Blob(["reading"], { type: "image/png" })),
}));
it("prepares separate summary files and full reading artwork", async () => {
  const renderer = vi.fn(render);
  const full = {
    ...comic,
    readingVersion: 2 as const,
    panels: Array(READING_PANEL_COUNT).fill(comic.panels[0]),
    stickerPanels: Array(3).fill(comic.panels[0]),
  };
  const result = await prepareStory(id, full, textSource(), renderer);
  expect(renderer).toHaveBeenCalledWith(full.stickerPanels, true);
  expect(renderer).toHaveBeenCalledWith(full.stickerPanels, false);
  expect(await result.colorImage.text()).toBe("reading");
  expect(await result.thumbnailImage?.text()).toBe("png");
  expect(result.panelCount).toBe(READING_PANEL_COUNT);
});
it("child reading comics have no print file or extra sticker rendering", async () => {
  const renderer = vi.fn(render);
  const result = await prepareStory(
    id,
    { ...comic, readingVersion: 2, panels: Array(READING_PANEL_COUNT).fill(comic.panels[0]) },
    textSource(),
    renderer,
  );
  expect(result.printImage).toBeNull();
  expect(submissionFormData(result).has("print_image")).toBe(false);
  expect(renderer).toHaveBeenCalledTimes(1);
  expect(renderer).toHaveBeenCalledWith([comic.panels[0]], false);
});
