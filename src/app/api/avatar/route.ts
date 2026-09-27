import { apiError, requireUser, requireParent } from "@/lib/server-auth";
import { limitRequest } from "@/lib/pairing";
import { referenceSchema } from "@/lib/ai/reference";
import { drawPanel } from "@/lib/ai/pipeline";
import { AVATAR_STYLE } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    requireParent(user);
    await limitRequest(request, user, "avatar", 15);
  } catch (e) {
    return apiError(e);
  }
  const body = await request.json().catch(() => null);
  const photo = referenceSchema.safeParse(body?.photo);
  if (!photo.success)
    return Response.json({ error: "Choose a valid JPEG, PNG or WebP photo." }, { status: 400 });
  try {
    const imageUrl = await drawPanel(
      `${AVATAR_STYLE}\nCreate one centered head-and-shoulders cartoon avatar of the person in the reference photo. Preserve their face, skin tone, hair and glasses. Plain cream backdrop, no other people.`,
      photo.data,
    );
    return Response.json({ imageUrl });
  } catch {
    return Response.json(
      { error: "Couldn't draw your avatar. Check the AI configuration and try again." },
      { status: 502 },
    );
  }
}
