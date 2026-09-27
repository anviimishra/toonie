import { stickerPanelCountSchema } from "@/features/stories/sticker";
import { referenceSchema } from "@/lib/ai/reference";
import { z } from "zod";
import { MAX_STORY_CHARS } from "@/lib/ai/prompts";
import { makeComic, type ComicRequest } from "@/lib/ai/pipeline";
import { type ComicEvent } from "@/types";
/**
 * POST /api/comics — turn a recorded or typed story into a comic.
 *
 * multipart/form-data:
 *   panelCount  1-4
 *   audio       the recording (talk mode), or
 *   text        the typed story (type mode)
 *   narrator    optional: what the teller looks like, from their avatar
 *   reference   required: inline PNG/JPEG/WebP of the saved avatar
 *
 * Responds with NDJSON: one ComicEvent per line as each step finishes, so the
 * screen can show the words, then the captions, then each picture arriving.
 */
export const runtime = "nodejs";
// Six images are drawn in parallel; this leaves room for a slow one.
export const maxDuration = 300;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const fieldsSchema = z.object({
  reference: referenceSchema,
  panelCount: stickerPanelCountSchema,
  text: z
    .string()
    .trim()
    .min(10, "Write a little more so we have something to draw.")
    .max(MAX_STORY_CHARS)
    .optional(),
  narrator: z.string().max(300).optional(),
});
function problem(status: number, message: string): Response {
  return Response.json({ error: { code: "invalid_request", message } }, { status });
}
function extensionFor(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "m4a";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  return "webm";
}
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return problem(400, "Send the story as multipart form data.");
  }
  const text = form.get("text");
  const narrator = form.get("narrator");
  const fields = fieldsSchema.safeParse({
    reference: form.get("reference"),
    panelCount: form.get("panelCount"),
    text: typeof text === "string" && text.trim() ? text : undefined,
    narrator: typeof narrator === "string" && narrator.trim() ? narrator : undefined,
  });
  if (!fields.success) {
    return problem(400, fields.error.issues[0]?.message ?? "Invalid request.");
  }
  const audio = form.get("audio");
  let comicRequest: ComicRequest;
  if (audio instanceof Blob && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES) return problem(413, "That recording is too long.");
    comicRequest = {
      kind: "audio",
      audio,
      filename: `story.${extensionFor(audio.type)}`,
      panelCount: fields.data.panelCount,
      narrator: fields.data.narrator,
      reference: fields.data.reference,
    };
  } else if (fields.data.text) {
    comicRequest = {
      kind: "text",
      text: fields.data.text,
      panelCount: fields.data.panelCount,
      narrator: fields.data.narrator,
      reference: fields.data.reference,
    };
  } else {
    return problem(400, "Send either a recording or some text.");
  }
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
    async start(controller) {
      const emit = (event: ComicEvent) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      await makeComic(comicRequest, emit);
      if (!cancelled) controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Stop proxies buffering the stream, which would hide the progress.
      "X-Accel-Buffering": "no",
    },
  });
}
