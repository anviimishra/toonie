import { z } from "zod";
import { apiError, requireUser, ApiError } from "@/lib/server-auth";
import { limitRequest, secretHash } from "@/lib/pairing";
export async function POST(request: Request) {
  try {
    const { user, db } = await requireUser(request);
    if (!user.is_anonymous) throw new ApiError(403, "Use the child device session to connect.");
    await limitRequest(request, user, "claim-code", 5);
    const parsed = z.object({ code: z.string().regex(/^\d{5}$/) }).safeParse(await request.json());
    if (!parsed.success)
      throw new ApiError(400, "Enter the five-digit code from the parent screen.");
    const { data, error } = await db.rpc("claim_child_code", {
      p_hash: secretHash(`pair:${parsed.data.code}`),
      p_child: user.id,
    });
    if (error) throw new ApiError(400, "That code is invalid, expired, or already used.");
    return Response.json({ pairId: data });
  } catch (e) {
    return apiError(e);
  }
}
