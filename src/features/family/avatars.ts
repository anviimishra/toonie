import {
  type Avatar,
  type AvatarAdapter,
  DEFAULT_AVATAR_CONFIG,
  isAvatarConfig,
  normalizeConfig,
} from "@/features/avatar";
import type { FamilyMember } from "@/lib/supabase/types";

/**
 * Keeping avatars in step between this tablet and Supabase (family_members).
 *
 * Each tablet keeps a local copy (fast, works offline, and what the editor
 * edits). Supabase holds the shared copy the other tablet and comic
 * generation use. These helpers move avatars between the two.
 */

/** A stored family member → an avatar this tablet can show and edit, or null. */
export function memberToAvatar(member: FamilyMember | null): Avatar | null {
  if (!member) return null;
  // Built avatars carry their recipe, so they stay editable on any tablet.
  if (isAvatarConfig(member.avatar_config)) {
    return { source: "preset", config: normalizeConfig(member.avatar_config) };
  }
  // Photo avatars only have the drawn picture.
  if (member.avatar_reference) {
    return {
      source: "photo",
      config: { ...DEFAULT_AVATAR_CONFIG },
      imageUrl: member.avatar_reference,
    };
  }
  return null;
}

/**
 * This tablet's avatar if it has one; otherwise the shared one from Supabase,
 * saved locally so the editor and later visits have it.
 */
export async function loadAvatar(
  store: AvatarAdapter,
  fetchShared: () => Promise<FamilyMember | null>,
): Promise<Avatar | null> {
  const local = await store.get().catch(() => null);
  if (local) return local;

  const shared = memberToAvatar(await fetchShared().catch(() => null));
  if (shared) await store.save(shared).catch(() => {});
  return shared;
}

/**
 * Upload this tablet's avatar when Supabase doesn't have one yet (e.g. it was
 * made before the child tablet was paired). Returns true if it uploaded.
 */
export async function backfillAvatar(
  local: Avatar | null,
  shared: FamilyMember | null,
  upload: (avatar: Avatar) => Promise<unknown>,
): Promise<boolean> {
  if (!local || !shared) return false;
  if (shared.avatar_reference || shared.avatar_config) return false;
  await upload(local);
  return true;
}
