import { limitRequest } from "@/lib/pairing";
import { apiError, requirePair, requireUser, ApiError } from "@/lib/server-auth";
import { deliverySchema, deliveryFiles } from "@/features/messages/contract";
import { contentHash, signDelivery } from "@/lib/delivery-ticket";
import { BUCKET_MESSAGE_MEDIA } from "@/lib/supabase/types";
export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    await limitRequest(request, user, "upload", 30);
    const parsed = deliverySchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "The message files or text are incomplete.");
    const input = parsed.data;
    const pair = await requirePair(db, input.pairId, user);
    const { data: existing, error } = await db
      .from("comic_messages")
      .select("pair_id,content_hash,sender_role")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw error;
    if (existing) {
      if (
        existing.pair_id !== input.pairId ||
        existing.content_hash !== contentHash(input) ||
        existing.sender_role !== (pair.parent_id === user.id ? "parent" : "child")
      )
        throw new ApiError(409, "That message ID is already used. Create a new comic.");
      return Response.json({ sent: true, id: input.id });
    }
    const candidates = await Promise.all(
      deliveryFiles(input).map(async (file) => {
        const { data, error } = await db.storage
          .from(BUCKET_MESSAGE_MEDIA)
          .createSignedUploadUrl(file.path, { upsert: false });
        // A previous attempt may have uploaded this object before losing its response.
        // Never overwrite it: the send endpoint verifies its exact bytes before publishing.
        if (error && /already exists|duplicate|resource already/i.test(error.message)) return null;
        if (error) throw error;
        return { key: file.key, path: file.path, token: data.token };
      }),
    );
    const uploads = candidates.filter((upload) => upload !== null);
    return Response.json(
      { sent: false, ticket: signDelivery(input, user.id), uploads },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
