import { createHash } from "node:crypto";
import { apiError, requirePair, requireUser, ApiError } from "@/lib/server-auth";
import { readDelivery, contentHash } from "@/lib/delivery-ticket";
import { deliveryFiles } from "@/features/messages/contract";
import { BUCKET_MESSAGE_MEDIA } from "@/lib/supabase/types";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    const body = await request.json();
    if (typeof body.ticket !== "string" || body.ticket.length > 65536)
      throw new ApiError(400, "Missing upload session.");
    const input = readDelivery(body.ticket, user.id);
    const pair = await requirePair(db, input.pairId, user);
    const digest = contentHash(input);
    const { data: existing, error: findError } = await db
      .from("comic_messages")
      .select("pair_id,content_hash,sender_role")
      .eq("id", input.id)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) {
      if (
        existing.pair_id !== input.pairId ||
        existing.content_hash !== digest ||
        existing.sender_role !== (pair.parent_id === user.id ? "parent" : "child")
      )
        throw new ApiError(409, "Message ID already used.");
      return Response.json({ id: input.id });
    }
    // A retry can encounter already-uploaded files. Verify their bytes rather than overwrite.
    for (const file of deliveryFiles(input)) {
      const { data, error } = await db.storage.from(BUCKET_MESSAGE_MEDIA).download(file.path);
      if (error || !data)
        throw new ApiError(409, "Some files have not finished uploading. Please send again.");
      if (
        data.size !== file.media.size ||
        createHash("sha256")
          .update(Buffer.from(await data.arrayBuffer()))
          .digest("hex") !== file.media.sha256
      )
        throw new ApiError(
          409,
          "An uploaded file does not match this comic. Please create a new comic.",
        );
    }
    const base = `${input.pairId}/${input.id}`;
    const { error } = await db.from("comic_messages").insert({
      id: input.id,
      pair_id: input.pairId,
      sender_role: pair.parent_id === user.id ? "parent" : "child",
      title: input.title,
      transcript: input.transcript,
      original_transcript: input.originalTranscript,
      comic_path: `${base}/comic.png`,
      print_path: input.print ? `${base}/print.png` : null,
      thumbnail_path: input.thumbnail ? `${base}/thumbnail.png` : null,
      audio_path: input.audio ? `${base}/voice` : null,
      audio_mime_type: input.audio?.type ?? null,
      audio_duration_ms: input.audioDurationMs,
      panel_count: input.panelCount,
      content_hash: digest,
    });
    if (error) {
      if (error.code !== "23505") throw error;
      const { data: retry } = await db
        .from("comic_messages")
        .select("content_hash,sender_role,pair_id")
        .eq("id", input.id)
        .maybeSingle();
      if (
        retry?.content_hash !== digest ||
        retry.pair_id !== input.pairId ||
        retry.sender_role !== (pair.parent_id === user.id ? "parent" : "child")
      )
        throw new ApiError(409, "Message ID already used.");
    }
    return Response.json({ id: input.id });
  } catch (e) {
    return apiError(e);
  }
}
