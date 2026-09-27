import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribe } from "@/lib/ai/transcribe";

/** Upper bound for one story; a few minutes of compressed audio is well under this. */
const MAX_BYTES = 10 * 1024 * 1024;

const audioSchema = z
  .instanceof(Blob, { message: "Send the recording as an 'audio' file." })
  .refine((file) => file.size > 0, "The recording is empty.")
  .refine((file) => file.size <= MAX_BYTES, "The recording is too long.")
  .refine(
    (file) => file.type === "" || file.type.startsWith("audio/") || file.type.startsWith("video/"),
    "That isn't an audio file.",
  );

/**
 * POST /api/transcribe  (multipart form: audio=<file>)
 * → { text, language, duration }
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const parsed = audioSchema.safeParse(form?.get("audio"));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const transcript = await transcribe(parsed.data);
    console.info(`[api/transcribe] ${transcript.duration ?? "?"}s: "${transcript.text}"`);
    return NextResponse.json(transcript);
  } catch (error) {
    console.error("[api/transcribe]", error);
    if (error instanceof Error && error.message.startsWith("Missing or invalid server env vars")) {
      return NextResponse.json(
        { error: "Transcription isn't set up: add XAI_API_KEY to .env.local." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Couldn't transcribe that recording." }, { status: 502 });
  }
}
