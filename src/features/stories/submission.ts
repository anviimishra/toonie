import { z } from "zod";
import { READING_PANEL_COUNT, type Comic } from "@/types";
import { renderReadingComic } from "./export-reading";

export type StorySource = {
  kind: "voice" | "text" | "unknown";
  audio: Blob | null;
  durationMs: number | null;
  /** Raw STT output, before the parent corrects the story text. */
  originalTranscript: string | null;
};

export const textSource = (): StorySource => ({
  kind: "text",
  audio: null,
  durationMs: null,
  originalTranscript: null,
});
export const legacySource = (): StorySource => ({ ...textSource(), kind: "unknown" });

export type PreparedStory = {
  version: 1;
  id: string;
  createdAt: string;
  title: string;
  transcript: string;
  source: StorySource;
  panelCount: number;
  colorImage: Blob;
  printImage: Blob | null;
  thumbnailImage?: Blob;
};

const manifestSchema = z.object({
  version: z.literal(1),
  clientStoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
  title: z.string().trim().min(1).max(80),
  transcript: z.string().trim().min(1).max(4000),
  source: z.enum(["voice", "text", "unknown"]),
  originalTranscript: z.string().nullable(),
  audioDurationMs: z.number().nonnegative().nullable(),
  panelCount: z.number().int().min(1).max(6),
  imageMimeType: z.literal("image/png"),
  audioMimeType: z.string().nullable(),
});

export function audioExtension(type: string): string {
  if (/mp4|m4a|aac/.test(type)) return "m4a";
  if (/ogg/.test(type)) return "ogg";
  if (/mpeg|mp3/.test(type)) return "mp3";
  if (/wav/.test(type)) return "wav";
  return "webm";
}

/** No schema/table assumptions: binary media plus a versioned JSON manifest. */
export function submissionFormData(story: PreparedStory): FormData {
  if (
    !story.colorImage.size ||
    story.colorImage.type !== "image/png" ||
    (story.printImage !== null && (!story.printImage.size || story.printImage.type !== "image/png"))
  ) {
    throw new Error("Both finished comic images must be prepared before uploading.");
  }
  if (story.source.kind === "voice" && !story.source.audio?.size)
    throw new Error("The original recording is missing.");
  if (story.source.kind !== "voice" && story.source.audio)
    throw new Error("Only a voice story can have a recording.");
  const manifest = manifestSchema.parse({
    version: story.version,
    clientStoryId: story.id,
    createdAt: story.createdAt,
    title: story.title,
    transcript: story.transcript,
    source: story.source.kind,
    originalTranscript: story.source.originalTranscript,
    audioDurationMs: story.source.durationMs,
    panelCount: story.panelCount,
    imageMimeType: "image/png",
    audioMimeType: story.source.audio?.type || null,
  });
  const form = new FormData();
  form.set("metadata", JSON.stringify(manifest));
  form.set("comic_image", story.colorImage, `${story.id}.png`);
  if (story.printImage) form.set("print_image", story.printImage, `${story.id}-print.png`);
  if (story.source.audio)
    form.set("audio", story.source.audio, `${story.id}.${audioExtension(story.source.audio.type)}`);
  return form;
}

export async function prepareStory(
  id: string,
  comic: Comic,
  source: StorySource,
  render: (panels: Comic["panels"], monochrome?: boolean) => Promise<Blob>,
): Promise<PreparedStory> {
  if (
    comic.format !== "sticker" ||
    !comic.panels.length ||
    [...comic.panels, ...(comic.stickerPanels ?? [])].some((panel) => !panel.imageUrl)
  )
    throw new Error("Finish the sticker before preparing its files.");
  const sticker = comic.readingVersion === 2 ? comic.stickerPanels : comic.panels;
  if (
    comic.readingVersion === 2 &&
    (comic.panels.length !== READING_PANEL_COUNT || (sticker && ![3, 4].includes(sticker.length)))
  )
    throw new Error("The reading comic or sticker is incomplete.");
  const [colorImage, printImage] = await Promise.all([
    render(sticker ?? [comic.panels[0]], false),
    sticker ? render(sticker, true) : Promise.resolve(null),
  ]);
  const story: PreparedStory = {
    version: 1,
    id,
    createdAt: new Date().toISOString(),
    title: comic.title,
    transcript: comic.transcript,
    source,
    panelCount: comic.panels.length,
    colorImage: comic.readingVersion ? await renderReadingComic(comic.panels) : colorImage,
    thumbnailImage: comic.readingVersion ? colorImage : undefined,
    printImage,
  };
  submissionFormData(story); // Validate readiness before saving or marking locally sent.
  return story;
}
