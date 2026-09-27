import { z } from "zod";
import { apiError, requireUser, requireParent, requirePair, ApiError } from "@/lib/server-auth";
import { referenceSchema } from "@/lib/ai/reference";
export async function GET(request: Request) {
  try {
    const { client } = await requireUser(request);
    const { data, error } = await client.from("parent_child_pairs").select("*")
      // Newest first: one child per parent, and a new code reuses the newest pair.
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ pairs: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    requireParent(user);
    const parsed = z
      .object({ id: z.string().uuid(), reference: referenceSchema })
      .safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Choose a valid child avatar.");
    const pair = await requirePair(db, parsed.data.id, user);
    if (pair.parent_id !== user.id)
      throw new ApiError(403, "Only the parent can change this avatar.");
    const { error } = await db
      .from("parent_child_pairs")
      .update({ child_avatar_reference: parsed.data.reference })
      .eq("id", pair.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
