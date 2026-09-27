import { z } from "zod";
import { deleteVoice } from "@/lib/ai/elevenlabs";
import { apiError, requireUser, requireParent, ApiError } from "@/lib/server-auth";
import { BUCKET_MESSAGE_MEDIA } from "@/lib/supabase/types";
import { parentPairIds } from "@/lib/voiceover";

/**
 * POST /api/family/voice  { consent: boolean }   (parents only)
 *
 * Turns "read my stories in my voice" on or off, for every child the parent is
 * paired with. Turning it off deletes the cloned voice at ElevenLabs and every
 * saved read-aloud made with it.
 */
export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    requireParent(user);
    const body = z
      .object({ consent: z.boolean() })
      .safeParse(await request.json().catch(() => null));
    if (!body.success) throw new ApiError(400, "Say whether to turn your voice on or off.");

    const pairIds = await parentPairIds(db, user.id);
    if (!pairIds.length) throw new ApiError(409, "Connect a child device first.");

    if (body.data.consent) {
      const { error } = await db
        .from("family_members")
        .update({ voice_consent_at: new Date().toISOString() })
        .eq("role", "parent")
        .in("pair_id", pairIds)
        .is("voice_consent_at", null);
      if (error) throw error;
      return Response.json({ consent: true });
    }

    // Off: delete the voice itself, then everything spoken with it.
    const { data: rows, error: rowsError } = await db
      .from("family_members")
      .select("voice_id")
      .eq("role", "parent")
      .in("pair_id", pairIds);
    if (rowsError) throw rowsError;
    const voiceIds = [...new Set(rows.map((r) => r.voice_id).filter((v): v is string => !!v))];
    for (const id of voiceIds) {
      await deleteVoice(id).catch((e) => console.warn("[voice] couldn't delete voice", e));
    }

    const { error: clearError } = await db
      .from("family_members")
      .update({ voice_consent_at: null, voice_id: null })
      .eq("role", "parent")
      .in("pair_id", pairIds);
    if (clearError) throw clearError;

    const { data: messages, error: messagesError } = await db
      .from("comic_messages")
      .select("id")
      .eq("sender_role", "parent")
      .in("pair_id", pairIds);
    if (messagesError) throw messagesError;
    const messageIds = messages.map((m) => m.id);
    if (messageIds.length) {
      const { data: saved, error: savedError } = await db
        .from("message_voiceovers")
        .select("audio_path")
        .in("message_id", messageIds);
      if (savedError) throw savedError;
      if (saved.length) {
        await db.storage.from(BUCKET_MESSAGE_MEDIA).remove(saved.map((v) => v.audio_path));
        const { error: deleteError } = await db
          .from("message_voiceovers")
          .delete()
          .in("message_id", messageIds);
        if (deleteError) throw deleteError;
      }
    }
    return Response.json({ consent: false, deletedVoices: voiceIds.length });
  } catch (e) {
    return apiError(e);
  }
}
