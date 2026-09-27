import { apiError, requireUser, requirePair, ApiError } from "@/lib/server-auth";
import { limitRequest } from "@/lib/pairing";
import { stickerPanelCountSchema } from "@/features/stories/sticker";
import { referenceSchema } from "@/lib/ai/reference";
import { z } from "zod";
import { isLanguage, type LanguageCode } from "@/features/settings/languages";
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
 *   language    optional: ISO 639-1 code the story is spoken in (default en)
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
  // The storyteller's language from Settings; transcription only, no translation.
  language: z.custom<LanguageCode>(isLanguage, "Unknown language.").optional(),
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
  let identity;
  try {
    identity = await requireUser(request);
    await limitRequest(request, identity.user, "generate", 15);
  } catch (e) {
    return apiError(e);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return problem(400, "Send the story as multipart form data.");
  }
  if (identity.user.is_anonymous) {
    try {
      const pairId = z.string().uuid().safeParse(form.get("pairId"));
      if (!pairId.success) throw new ApiError(400, "Connect your child device first.");
      const pair = await requirePair(identity.db, pairId.data, identity.user);
      // The parent sets the child's avatar from their own tablet (family_members);
      // pairs made before that table carry it on the pair itself.
      const { data: member, error: memberError } = await identity.db
        .from("family_members")
        .select("avatar_reference, language")
        .eq("pair_id", pair.id)
        .eq("role", "child")
        .maybeSingle();
      if (memberError) throw memberError;
      const reference = member?.avatar_reference ?? pair.child_avatar_reference;
      if (pair.child_id !== identity.user.id || !reference)
        throw new ApiError(403, "Ask your parent to sync your avatar in Settings.");
      form.set("reference", reference);
      // The child's language is set by the parent; ignore anything the device sends.
      form.set("language", isLanguage(member?.language) ? member.language : "en");
      form.set(
        "narrator",
        "The narrator is the exact child character in the supplied reference image.",
      );
    } catch (e) {
      return apiError(e);
    }
  }
  const text = form.get("text");
  const narrator = form.get("narrator");
  const language = form.get("language");
  const fields = fieldsSchema.safeParse({
    reference: form.get("reference"),
    panelCount: form.get("panelCount"),
    text: typeof text === "string" && text.trim() ? text : undefined,
    narrator: typeof narrator === "string" && narrator.trim() ? narrator : undefined,
    language: typeof language === "string" && language ? language : undefined,
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
      language: fields.data.language,
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
