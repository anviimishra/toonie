import { isLanguage, languageLabel, type LanguageCode } from "@/features/settings/languages";
import { cloneVoice, speak } from "@/lib/ai/elevenlabs";
import { translate } from "@/lib/ai/translate";
import { ApiError } from "@/lib/server-auth";
import type { supabaseServer } from "@/lib/supabase/server";
import {
  BUCKET_MESSAGE_MEDIA,
  type ComicMessage,
  type FamilyMember,
  type ParentChildPair,
} from "@/lib/supabase/types";

/**
 * Read-alouds: a story from the parent, translated into the child's language
 * (Gemini) and spoken in the parent's own cloned voice (ElevenLabs).
 *
 * Only a parent's voice is ever cloned, and only after they've opted in
 * (family_members.voice_consent_at). Without consent the child still gets the
 * translated text, just no audio. Each (story, language) is generated once and
 * saved in message_voiceovers.
 */

type Db = ReturnType<typeof supabaseServer>;

export type Voiceover = {
  language: LanguageCode;
  text: string;
  /** Short-lived link to the spoken audio, or null when there's no voice. */
  audioUrl: string | null;
  /** Why there's no audio, for the screen to explain. */
  note: "voice-off" | "no-sample" | "voice-unavailable" | null;
};

/** What to do for a story, given who's in the pair and what's saved. Pure. */
export function planVoiceover(
  message: Pick<ComicMessage, "sender_role" | "audio_path">,
  parent: Pick<FamilyMember, "voice_consent_at" | "voice_id"> | null,
  child: Pick<FamilyMember, "language"> | null,
) {
  if (message.sender_role !== "parent") {
    // Never clone or voice a child.
    throw new ApiError(400, "Only stories from a grown-up can be read aloud.");
  }
  // What the parent actually spoke can differ from their settings, so don't
  // guess the source language: always translate, and let the model detect it.
  const to: LanguageCode = isLanguage(child?.language) ? child.language : "en";
  const consented = Boolean(parent?.voice_consent_at);
  return {
    to,
    voice: !consented
      ? ({ kind: "none", note: "voice-off" } as const)
      : parent?.voice_id
        ? ({ kind: "use", voiceId: parent.voice_id } as const)
        : message.audio_path
          ? ({ kind: "clone", samplePath: message.audio_path } as const)
          : ({ kind: "none", note: "no-sample" } as const),
  };
}

const audioPath = (message: ComicMessage, language: string) =>
  `${message.pair_id}/${message.id}/voiceover-${language}.mp3`;

async function signed(db: Db, path: string): Promise<string> {
  const { data, error } = await db.storage.from(BUCKET_MESSAGE_MEDIA).createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Couldn't sign the read-aloud.");
  return data.signedUrl;
}

/** The read-aloud for one received story, generating and saving it if needed. */
export async function getVoiceover(
  db: Db,
  message: ComicMessage,
  pair: ParentChildPair,
): Promise<Voiceover> {
  const { data: members, error } = await db
    .from("family_members")
    .select("*")
    .eq("pair_id", pair.id);
  if (error) throw error;
  const parent = members.find((m) => m.role === "parent") ?? null;
  const child = members.find((m) => m.role === "child") ?? null;
  const plan = planVoiceover(message, parent, child);

  // Already made for this language?
  const { data: saved, error: savedError } = await db
    .from("message_voiceovers")
    .select("*")
    .eq("message_id", message.id)
    .eq("language", plan.to)
    .maybeSingle();
  if (savedError) throw savedError;
  if (saved) {
    return {
      language: plan.to,
      text: saved.text,
      audioUrl: await signed(db, saved.audio_path),
      note: null,
    };
  }

  const text = await translate(message.transcript, { to: languageLabel(plan.to) });

  // Work out which voice to use, cloning the parent's (with consent) if needed.
  let voiceId: string | null = null;
  if (plan.voice.kind === "use") voiceId = plan.voice.voiceId;
  if (plan.voice.kind === "clone") {
    const { data: sample, error: sampleError } = await db.storage
      .from(BUCKET_MESSAGE_MEDIA)
      .download(plan.voice.samplePath);
    if (sampleError || !sample) throw sampleError ?? new Error("Couldn't read the voice clip.");
    const clone = await cloneVoice(sample, `Toonie parent ${pair.parent_id.slice(0, 8)}`);
    voiceId = clone.voiceId;
    await rememberVoice(db, pair.parent_id, voiceId);
  }
  if (!voiceId) {
    const note = plan.voice.kind === "none" ? plan.voice.note : null;
    return { language: plan.to, text, audioUrl: null, note };
  }

  let audio: Blob;
  try {
    audio = await speak(voiceId, text);
  } catch (error) {
    // e.g. the clone still needs verification at ElevenLabs: show the words anyway.
    console.warn("[voiceover] speech failed", error instanceof Error ? error.message : error);
    return { language: plan.to, text, audioUrl: null, note: "voice-unavailable" };
  }

  const path = audioPath(message, plan.to);
  const { error: uploadError } = await db.storage
    .from(BUCKET_MESSAGE_MEDIA)
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (uploadError) throw uploadError;
  const { error: saveError } = await db
    .from("message_voiceovers")
    .upsert({ message_id: message.id, language: plan.to, text, audio_path: path });
  if (saveError) throw saveError;

  return { language: plan.to, text, audioUrl: await signed(db, path), note: null };
}

/** The parent's voice is theirs across every child they're paired with. */
async function rememberVoice(db: Db, parentId: string, voiceId: string) {
  const pairIds = await parentPairIds(db, parentId);
  const { error } = await db
    .from("family_members")
    .update({ voice_id: voiceId })
    .eq("role", "parent")
    .in("pair_id", pairIds);
  if (error) throw error;
}

export async function parentPairIds(db: Db, parentId: string): Promise<string[]> {
  const { data, error } = await db
    .from("parent_child_pairs")
    .select("id")
    .eq("parent_id", parentId);
  if (error) throw error;
  return data.map((p) => p.id);
}
