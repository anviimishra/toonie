import { transcribe } from "./transcribe";
import { stickerAspectRatio } from "@/features/stories/sticker";
import { aiEnv } from "@/lib/env";
import { titledScriptSchema, type Comic, type ComicEvent, type TitledScript } from "@/types";
import {
  SCRIPT_JSON_SCHEMA,
  panelImagePrompt,
  scriptSystemPrompt,
  scriptUserPrompt,
} from "./prompts";
import { XaiError, withRetry, xaiPost } from "./xai";
/**
 * Story in, comic out: transcribe → script → draw every panel at once.
 * Server only.
 */
// ------------------------------------------------------------------ steps
type ChatResponse = { choices?: { message?: { content?: string } }[] };
export async function writeScript(
  story: string,
  panelCount: number,
  narrator?: string,
): Promise<TitledScript> {
  const ask = () =>
    withRetry(() =>
      xaiPost<ChatResponse>("/chat/completions", {
        timeoutMs: 60_000,
        body: {
          model: aiEnv().XAI_TEXT_MODEL,
          messages: [
            { role: "system", content: scriptSystemPrompt(panelCount) },
            { role: "user", content: scriptUserPrompt(story, narrator) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "comic_script", strict: true, schema: SCRIPT_JSON_SCHEMA },
          },
        },
      }),
    );
  // The schema fixes the shape but not the panel count, so check it and ask
  // once more if the model miscounted.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ask();
    const raw = response.choices?.[0]?.message?.content ?? "";
    const script = parseScript(raw, panelCount);
    if (script) return script;
  }
  throw new XaiError(
    "The story couldn't be turned into panels. Try again?",
    502,
    "/chat/completions",
  );
}
/** Reject wrong panel counts rather than silently losing the story ending. */
export function parseScript(raw: string, panelCount: number): TitledScript | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = titledScriptSchema.safeParse(json);
  if (!result.success) return null;
  const script = result.data;
  if (script.panels.length !== panelCount) return null;
  return { ...script, panels: script.panels.map((panel) => ({ ...panel, caption: "" })) };
}
type ImageResponse = { data?: { b64_json?: string }[] };
export async function drawPanel(
  prompt: string,
  reference: string,
  aspectRatio = "1:1",
): Promise<string> {
  const result = await withRetry(() =>
    xaiPost<ImageResponse>("/images/edits", {
      timeoutMs: 90_000,
      body: {
        model: aiEnv().XAI_IMAGE_MODEL,
        prompt,
        n: 1,
        aspect_ratio: aspectRatio,
        response_format: "b64_json",
        image: { url: reference, type: "image_url" },
      },
    }),
  );
  const bytes = result.data?.[0]?.b64_json;
  const url = bytes ? `data:image/jpeg;base64,${bytes}` : undefined;
  if (!url) throw new XaiError("No image came back", 502, "/images/edits");
  return url;
}
// ------------------------------------------------------------ orchestrator
export type ComicRequest =
  | {
      kind: "audio";
      audio: Blob;
      filename: string;
      panelCount: number;
      narrator?: string;
      reference: string;
    }
  | { kind: "text"; text: string; panelCount: number; narrator?: string; reference: string };
function friendly(error: unknown): string {
  if (error instanceof XaiError) {
    if (error.status === 401 || error.status === 403) return "The AI key was rejected.";
    if (error.status === 429) return "Too many comics at once. Try again in a minute.";
    if (error.status === 0) return "Couldn't reach the AI service. Check the connection.";
    return error.message;
  }
  return "Something went wrong making the comic.";
}
/**
 * Runs the whole pipeline, reporting progress through `emit`. Never throws:
 * failures become an `error` event, and a single panel that fails to draw
 * becomes `panel_failed` while the rest of the comic still arrives.
 */
export async function makeComic(
  request: ComicRequest,
  emit: (event: ComicEvent) => void,
): Promise<void> {
  try {
    const transcript =
      request.kind === "audio" ? (await transcribe(request.audio)).text : request.text.trim();
    if (transcript.length < 3) {
      emit({ type: "error", message: "We couldn't hear a story in that. Try again a bit louder?" });
      return;
    }
    emit({ type: "transcribed", transcript });
    const script = await writeScript(transcript, request.panelCount, request.narrator);
    emit({ type: "scripted", title: script.title, panels: script.panels });
    const results = await Promise.all(
      script.panels.map(async (panel, index) => {
        try {
          const imageUrl = await drawPanel(
            panelImagePrompt({
              scene: panel.scene,
              cast: script.cast,
              index,
              total: script.panels.length,
              narrator: request.narrator,
            }),
            request.reference,
            stickerAspectRatio(script.panels.length, index),
          );
          emit({ type: "panel", index, imageUrl });
          return { ...panel, imageUrl };
        } catch (error) {
          emit({ type: "panel_failed", index, message: friendly(error) });
          return { ...panel, imageUrl: undefined };
        }
      }),
    );
    if (results.some((panel) => !panel.imageUrl)) {
      emit({
        type: "error",
        message:
          "Some pictures could not be drawn. Your comic has not been sent. Please try again.",
      });
      return;
    }
    const comic: Comic = { title: script.title, transcript, panels: results, format: "sticker" };
    emit({ type: "done", comic });
  } catch (error) {
    console.error("[comics] pipeline failed:", error);
    emit({ type: "error", message: friendly(error) });
  }
}
