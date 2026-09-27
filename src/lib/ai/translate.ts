import { voiceEnv } from "@/lib/env";

/**
 * Translation with Google Gemini (Interactions API). Server only.
 * Docs: https://ai.google.dev/api/interactions-api
 */

const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export class NotConfiguredError extends Error {}

type Options = {
  /** Target language, as a name the model understands (e.g. "Español"). */
  to: string;
  /** Source language name, if known. */
  from?: string;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

export async function translate(text: string, options: Options): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (options.from && options.from === options.to) return trimmed;

  const env = options.apiKey ? null : voiceEnv();
  const apiKey = options.apiKey ?? env?.GEMINI_API_KEY;
  if (!apiKey) throw new NotConfiguredError("GEMINI_API_KEY is not set.");
  const model = options.model ?? env?.GEMINI_MODEL ?? "gemini-3.8-flash";

  const response = await (options.fetchImpl ?? fetch)(INTERACTIONS_URL, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system_instruction: [
        `Translate the user's text${options.from ? ` from ${options.from}` : ""} into ${options.to}.`,
        "It is a short story a parent told their child, and it will be read aloud.",
        "Keep the meaning, warmth, and names; use simple words a child understands.",
        `If it is already in ${options.to}, return it unchanged.`,
        "Reply with only the translation: no quotes, notes, or explanations.",
      ].join(" "),
      input: trimmed,
      generation_config: { temperature: 0.2, thinking_level: "low" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini translation failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const translated = outputText(await response.json());
  if (!translated) throw new Error("Gemini returned no translation.");
  return translated;
}

/** The model's text from an interaction: every text part of every model_output step. */
export function outputText(interaction: unknown): string {
  const steps = (interaction as { steps?: unknown })?.steps;
  if (!Array.isArray(steps)) return "";
  return steps
    .filter((step) => step?.type === "model_output" && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("")
    .trim();
}
