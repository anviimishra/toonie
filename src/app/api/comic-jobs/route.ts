import { apiError, requireUser, ApiError } from "@/lib/server-auth";
import { currentComicJob } from "@/lib/comic-jobs";
export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    return Response.json(
      { job: await currentComicJob(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { user, db } = await requireUser(request);
    const id = new URL(request.url).searchParams.get("id") ?? (await currentComicJob(user.id))?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, "Invalid comic job.");
    const { data, error } = await db
      .from("comic_jobs")
      .update({ archived: true })
      .eq("user_id", user.id)
      .eq("id", id)
      .eq("archived", false)
      .neq("status", "working")
      .select("id");
    if (error) throw error;
    if (!data.length)
      throw new ApiError(409, "Wait for the current comic to finish before starting another.");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
