import { apiError, requireUser } from "@/lib/server-auth";
import { BUCKET_MESSAGE_MEDIA } from "@/lib/supabase/types";
export async function GET(request: Request) {
  try {
    const { user, client } = await requireUser(request);
    const { data: pairs, error: pairError } = await client.from("parent_child_pairs").select("*");
    if (pairError) throw pairError;
    const url = new URL(request.url),
      id = url.searchParams.get("id");
    let query = client
      .from("comic_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (id) query = query.eq("id", id);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    const items = await Promise.all(
      data.map(async (m) => {
        const pair = pairs.find((p) => p.id === m.pair_id)!;
        const ownRole = pair.parent_id === user.id ? "parent" : "child";
        const paths = [
          m.comic_path,
          ...(m.thumbnail_path ? [m.thumbnail_path] : []),
          ...(m.audio_path ? [m.audio_path] : []),
          ...(m.print_path ? [m.print_path] : []),
        ];
        const { data: signed, error: signError } = await client.storage
          .from(BUCKET_MESSAGE_MEDIA)
          .createSignedUrls(paths, 3600);
        if (signError || !signed || signed.some((s) => !s.signedUrl))
          throw signError ?? new Error("Media unavailable");
        const media = (path: string | null) => signed.find((s) => s.path === path)?.signedUrl;
        return {
          id: m.id,
          pairId: m.pair_id,
          format: "sticker",
          title: m.title,
          transcript: m.transcript,
          createdAt: m.created_at,
          panelCount: m.panel_count,
          panels: [],
          imageUrl: media(m.comic_path),
          thumbnailUrl: media(m.thumbnail_path),
          audioUrl: media(m.audio_path),
          printUrl: m.sender_role === "parent" ? media(m.print_path) : undefined,
          direction: m.sender_role === ownRole ? "sent" : "received",
          status: m.sender_role !== ownRole && !m.read_at ? "new" : "seen",
          sender: {
            name: m.sender_role === "parent" ? "Parent" : pair.child_name,
            color: "#d8b4fe",
          },
        };
      }),
    );
    return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
