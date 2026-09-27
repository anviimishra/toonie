import { z } from "zod";
import { apiError, requireUser, ApiError } from "@/lib/server-auth";
export async function POST(request: Request) {
  try {
    const { client } = await requireUser(request);
    const body = z.object({ id: z.string().uuid() }).safeParse(await request.json());
    if (!body.success) throw new ApiError(400, "Invalid message.");
    const { data, error } = await client
      .from("comic_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", body.data.id)
      .is("read_at", null)
      .select("id");
    if (error) throw error;
    return Response.json({ updated: data.length > 0 });
  } catch (e) {
    return apiError(e);
  }
}
