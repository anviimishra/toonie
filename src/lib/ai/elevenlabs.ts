import { voiceEnv } from "@/lib/env";
import { NotConfiguredError } from "./translate";

/**
 * ElevenLabs: clone a parent's voice (only after they opt in) and speak text
 * in it. Server only.
 * Docs: https://elevenlabs.io/docs/api-reference/voices/ivc/create
 *       https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 */

const BASE_URL = "https://api.elevenlabs.io/v1";

type Deps = { apiKey?: string; model?: string; fetchImpl?: typeof fetch };

function setup(deps: Deps) {
  const env = deps.apiKey ? null : voiceEnv();
  const apiKey = deps.apiKey ?? env?.ELEVENLABS_API_KEY;
  if (!apiKey) throw new NotConfiguredError("ELEVENLABS_API_KEY is not set.");
  return {
    apiKey,
    model: deps.model ?? env?.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
    doFetch: deps.fetchImpl ?? fetch,
  };
}

async function fail(response: Response, what: string): Promise<never> {
  const detail = await response.text().catch(() => "");
  throw new Error(`ElevenLabs ${what} failed (${response.status}): ${detail.slice(0, 300)}`);
}

export type ClonedVoice = { voiceId: string; requiresVerification: boolean };

/** Instant voice clone from a recording of the (consenting) parent. */
export async function cloneVoice(
  sample: Blob,
  name: string,
  deps: Deps = {},
): Promise<ClonedVoice> {
  const { apiKey, doFetch } = setup(deps);
  const form = new FormData();
  form.append("name", name);
  form.append("description", "A Toonie parent's own voice, cloned with their consent.");
  form.append("remove_background_noise", "true");
  form.append("files", sample, "sample" + extension(sample.type));

  const response = await doFetch(`${BASE_URL}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!response.ok) return fail(response, "voice clone");
  const data = (await response.json()) as { voice_id?: unknown; requires_verification?: unknown };
  if (typeof data.voice_id !== "string") throw new Error("ElevenLabs returned no voice id.");
  return { voiceId: data.voice_id, requiresVerification: data.requires_verification === true };
}

/** Speak `text` in a voice. The multilingual model follows the text's language. */
export async function speak(voiceId: string, text: string, deps: Deps = {}): Promise<Blob> {
  const { apiKey, model, doFetch } = setup(deps);
  const response = await doFetch(
    `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: model }),
    },
  );
  if (!response.ok) return fail(response, "speech");
  return new Blob([await response.arrayBuffer()], { type: "audio/mpeg" });
}

/** Delete a cloned voice, e.g. when the parent turns the feature off. */
export async function deleteVoice(voiceId: string, deps: Deps = {}): Promise<void> {
  const { apiKey, doFetch } = setup(deps);
  const response = await doFetch(`${BASE_URL}/voices/${encodeURIComponent(voiceId)}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok && response.status !== 404) return fail(response, "voice delete");
}

function extension(type: string): string {
  if (/mp4|m4a|aac/.test(type)) return ".m4a";
  if (/ogg/.test(type)) return ".ogg";
  if (/mpeg|mp3/.test(type)) return ".mp3";
  if (/wav/.test(type)) return ".wav";
  return ".webm";
}
