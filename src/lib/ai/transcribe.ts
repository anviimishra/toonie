import { serverEnv } from "@/lib/env";

/**
 * Speech to text with xAI (grok-voice-transcribe).
 * Server only: it uses the secret XAI_API_KEY.
 * Docs: https://docs.x.ai/developers/model-capabilities/audio/speech-to-text
 */

const STT_URL = "https://api.x.ai/v1/stt";

export type Transcript = {
  text: string;
  language: string | null;
  /** Seconds of audio. */
  duration: number | null;
};

export async function transcribe(
  audio: Blob,
  options: { apiKey?: string; model?: string; fetchImpl?: typeof fetch } = {},
): Promise<Transcript> {
  const env = options.apiKey ? null : serverEnv();
  const apiKey = options.apiKey ?? env!.XAI_API_KEY;
  const model = options.model ?? env?.XAI_TRANSCRIBE_MODEL ?? "grok-voice-transcribe-2.0";
  const doFetch = options.fetchImpl ?? fetch;

  const form = new FormData();
  form.append("model", model);
  form.append("language", "en");
  form.append("format", "true"); // punctuation and capitals
  // xAI requires the file to be the last field.
  form.append("file", audio, `story.${extensionFor(audio.type)}`);

  const response = await doFetch(STT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`xAI transcription failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    text?: unknown;
    language?: unknown;
    duration?: unknown;
  };
  if (typeof data.text !== "string") {
    throw new Error("xAI transcription returned no text.");
  }

  return {
    text: data.text.trim(),
    language: typeof data.language === "string" ? data.language : null,
    duration: typeof data.duration === "number" ? data.duration : null,
  };
}

/** A file extension xAI can sniff; the container is auto-detected anyway. */
export function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a"; // Safari / iPhone
  if (mimeType.includes("ogg")) return "ogg"; // Firefox
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm"; // Chrome
}
