import { randomInt } from "node:crypto";
import { z } from "zod";
import { referenceSchema } from "@/lib/ai/reference";
import { apiError, requireUser, requireParent, ApiError } from "@/lib/server-auth";
import { limitRequest, secretHash } from "@/lib/pairing";
export async function POST(request: Request) {
  try {
    const { user, db } = await requireUser(request);
    requireParent(user);
    await limitRequest(request, user, "issue-code", 5);
    const parsed = z
      .object({ name: z.string().trim().min(1).max(60), reference: referenceSchema })
      .safeParse(await request.json());
    if (!parsed.success)
      throw new ApiError(400, "Enter a child name and save a child avatar first.");
    const { error: cleanError } = await db
      .from("pairing_codes")
      .delete()
      .eq("parent_id", user.id)
      .is("claimed_child_id", null);
    if (cleanError) throw cleanError;
    const { error: expiredError } = await db
      .from("pairing_codes")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (expiredError) throw expiredError;
    const expiresAt = new Date(Date.now() + 600000).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = String(randomInt(10000, 100000));
      const { error } = await db.from("pairing_codes").insert({
        code_hash: secretHash(`pair:${code}`),
        parent_id: user.id,
        child_name: parsed.data.name,
        child_avatar_reference: parsed.data.reference,
        expires_at: expiresAt,
        claimed_child_id: null,
        pair_id: null,
      });
      if (!error)
        return Response.json({ code, expiresAt }, { headers: { "Cache-Control": "no-store" } });
      if (error.code !== "23505") throw error;
    }
    throw new ApiError(503, "Couldn't make a pairing code. Try again shortly.");
  } catch (e) {
    return apiError(e);
  }
}
