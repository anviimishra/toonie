import { avatarReference } from "@/features/avatar/reference";
import type { Avatar } from "@/features/avatar";
import { getPairs } from "@/features/messages/client";
import { settings } from "@/features/settings";
import { type LanguageCode, isLanguage } from "@/features/settings/languages";
import { apiJson, jsonBody } from "@/lib/api-client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { FamilyMember } from "@/lib/supabase/types";

export type FamilyRole = FamilyMember["role"];
export type Family = { parent: FamilyMember | null; child: FamilyMember | null };

/** Both people's settings for a pair. Works from either tablet. */
export const getFamily = (pairId: string, child = false) =>
  apiJson<Family>(`/api/family?pairId=${encodeURIComponent(pairId)}`, {}, child);

type MemberPatch = {
  language?: LanguageCode;
  avatarReference?: string | null;
  avatarConfig?: Record<string, unknown> | null;
};

/** Parent only: change one person's settings in one pair. */
export const updateFamilyMember = (pairId: string, role: FamilyRole, patch: MemberPatch) =>
  apiJson<FamilyMember>("/api/family", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairId, role, ...patch }),
  });

/** Upload one avatar (the picture, plus the recipe for built ones) to one pair. */
export async function uploadAvatar(pairId: string, role: FamilyRole, avatar: Avatar) {
  return updateFamilyMember(pairId, role, {
    avatarReference: await avatarReference(avatar),
    avatarConfig: avatar.source === "preset" ? { ...avatar.config } : null,
  });
}

/**
 * After the parent saves an avatar on their tablet, copy it to every
 * connected pair so the other tablet (and comic generation) uses it.
 * Returns how many pairs were updated; 0 when nothing is connected yet.
 */
export async function syncAvatar(role: FamilyRole, avatar: Avatar): Promise<number> {
  // Not signed in, or signed out, means nothing is connected to update.
  const { data } = await supabaseBrowser().auth.getSession();
  if (!data.session) return 0;
  const pairs = await getPairs();
  await Promise.all(pairs.map((pair) => uploadAvatar(pair.id, role, avatar)));
  return pairs.length;
}

/** The shared copy of one person's settings from the first connected pair, if any. */
export async function sharedMember(role: FamilyRole): Promise<FamilyMember | null> {
  const [pair] = await getPairs();
  if (!pair) return null;
  return (await getFamily(pair.id))[role];
}

/**
 * The grown-up's language for transcribing their stories: the shared one when
 * a child tablet is connected, otherwise the one chosen on this tablet.
 */
export async function parentLanguage(): Promise<LanguageCode> {
  const shared = await sharedMember("parent").catch(() => null);
  if (isLanguage(shared?.language)) return shared.language;
  return (await settings.get()).parentLanguage;
}

/** Parent only: turn "read my stories in my voice" on or off for every child. */
export const setVoiceConsent = (consent: boolean) =>
  apiJson<{ consent: boolean }>("/api/family/voice", jsonBody({ consent }));

export type Voiceover = {
  language: LanguageCode;
  text: string;
  audioUrl: string | null;
  note: "voice-off" | "no-sample" | "voice-unavailable" | null;
};

/** Child's tablet: a received story, translated and spoken in the parent's voice. */
export const getVoiceover = (messageId: string) =>
  apiJson<Voiceover>("/api/messages/voiceover", jsonBody({ id: messageId }), true);
