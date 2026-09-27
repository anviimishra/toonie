import { z } from "zod";
import { isLanguage, type LanguageCode } from "@/features/settings/languages";
import { referenceSchema } from "@/lib/ai/reference";
import { apiError, requireUser, requireParent, requirePair, ApiError } from "@/lib/server-auth";
import type { FamilyMember } from "@/lib/supabase/types";

/**
 * GET   /api/family?pairId=…  → { parent, child }   (either tablet in the pair)
 * PATCH /api/family  { pairId, role, language?, avatarReference?, avatarConfig? }
 *       → the updated member                        (the pair's parent only)
 *
 * The parent and child use different tablets, so each person's language and
 * avatar live in `family_members`, not in one browser.
 */

export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    const pairId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("pairId"));
    if (!pairId.success) throw new ApiError(400, "Choose a connected device.");
    const pair = await requirePair(db, pairId.data, user);

    const { data, error } = await db.from("family_members").select("*").eq("pair_id", pair.id);
    if (error) throw error;
    const find = (role: FamilyMember["role"]) => data.find((m) => m.role === role) ?? null;
    return Response.json(
      { parent: find("parent"), child: find("child") },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z
  .object({
    pairId: z.string().uuid(),
    role: z.enum(["parent", "child"]),
    language: z.custom<LanguageCode>(isLanguage, "Unknown language.").optional(),
    avatarReference: referenceSchema.nullable().optional(),
    avatarConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine(
    (b) =>
      b.language !== undefined || b.avatarReference !== undefined || b.avatarConfig !== undefined,
    "Nothing to change.",
  );

export async function PATCH(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    requireParent(user);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
    const { pairId, role, language, avatarReference, avatarConfig } = parsed.data;

    const pair = await requirePair(db, pairId, user);
    if (pair.parent_id !== user.id) throw new ApiError(403, "Only the parent can change settings.");

    const { data, error } = await db
      .from("family_members")
      .upsert({
        pair_id: pair.id,
        role,
        ...(language !== undefined && { language }),
        ...(avatarReference !== undefined && { avatar_reference: avatarReference }),
        ...(avatarConfig !== undefined && { avatar_config: avatarConfig }),
      })
      .select()
      .single();
    if (error) throw error;

    // Older code reads the child's avatar from the pair; keep it in step.
    if (role === "child" && avatarReference) {
      const { error: pairError } = await db
        .from("parent_child_pairs")
        .update({ child_avatar_reference: avatarReference })
        .eq("id", pair.id);
      if (pairError) throw pairError;
    }

    return Response.json(data);
  } catch (e) {
    return apiError(e);
  }
}
