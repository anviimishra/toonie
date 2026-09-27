import { z } from "zod";
import { NotConfiguredError } from "@/lib/ai/translate";
import { apiError, requireUser, requirePair, ApiError } from "@/lib/server-auth";
import { getVoiceover } from "@/lib/voiceover";

/**
 * POST /api/messages/voiceover  { id }
 * → { language, text, audioUrl, note }
 *
 * For the child's tablet: a story from the parent, translated into the
 * child's language and spoken in the parent's voice (if they opted in).
 */
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    const body = z
      .object({ id: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!body.success) throw new ApiError(400, "Invalid message.");

    const { data: message, error } = await db
      .from("comic_messages")
      .select("*")
      .eq("id", body.data.id)
      .maybeSingle();
    if (error) throw error;
    if (!message) throw new ApiError(404, "Story not found.");

    const pair = await requirePair(db, message.pair_id, user);
    // Only the story's recipient gets it read to them.
    const recipient = message.sender_role === "parent" ? pair.child_id : pair.parent_id;
    if (recipient !== user.id) throw new ApiError(403, "This story wasn't sent to you.");

    const voiceover = await getVoiceover(db, message, pair);
    console.info(
      `[voiceover] ${message.id.slice(0, 8)} → ${voiceover.language}` +
        (voiceover.audioUrl ? " with voice" : ` (text only: ${voiceover.note})`),
    );
    return Response.json(voiceover, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof NotConfiguredError) {
      return Response.json(
        { error: `Read-aloud isn't set up: ${e.message} Add it to .env.local.` },
        { status: 503 },
      );
    }
    return apiError(e);
  }
}
