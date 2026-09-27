import { describe, expect, it, vi } from "vitest";
import { type Avatar, type AvatarAdapter, DEFAULT_AVATAR_CONFIG } from "@/features/avatar";
import type { FamilyMember } from "@/lib/supabase/types";
import { backfillAvatar, loadAvatar, memberToAvatar } from "./avatars";

const IMAGE = "data:image/png;base64,Yg==";
const built = {
  skin: "cocoa",
  hair: "curly",
  hairColor: "black",
  glasses: true,
  background: "sky",
};

function member(patch: Partial<FamilyMember> = {}): FamilyMember {
  return {
    pair_id: "p",
    role: "child",
    language: "en",
    avatar_reference: null,
    avatar_config: null,
    voice_consent_at: null,
    voice_id: null,
    updated_at: "",
    ...patch,
  };
}

function memoryStore(initial: Avatar | null = null): AvatarAdapter & { saved: Avatar | null } {
  const store = {
    saved: initial,
    get: async () => store.saved,
    save: async (a: Avatar) => {
      store.saved = a;
    },
    generateFromPhoto: async () => {
      throw new Error("unused");
    },
  };
  return store;
}

describe("memberToAvatar", () => {
  it("rebuilds a built avatar from its recipe", () => {
    expect(memberToAvatar(member({ avatar_config: built, avatar_reference: IMAGE }))).toEqual({
      source: "preset",
      config: built,
    });
  });

  it("turns a photo avatar into its picture", () => {
    expect(memberToAvatar(member({ avatar_reference: IMAGE }))).toEqual({
      source: "photo",
      config: DEFAULT_AVATAR_CONFIG,
      imageUrl: IMAGE,
    });
  });

  it("is null when nothing is saved", () => {
    expect(memberToAvatar(member())).toBeNull();
    expect(memberToAvatar(null)).toBeNull();
  });
});

describe("loadAvatar", () => {
  it("prefers the avatar already on this tablet", async () => {
    const mine: Avatar = { source: "preset", config: built as Avatar["config"] };
    const fetchShared = vi.fn();
    expect(await loadAvatar(memoryStore(mine), fetchShared)).toEqual(mine);
    expect(fetchShared).not.toHaveBeenCalled();
  });

  it("fills an empty tablet from Supabase and keeps a local copy", async () => {
    const store = memoryStore();
    const avatar = await loadAvatar(store, async () => member({ avatar_reference: IMAGE }));
    expect(avatar?.imageUrl).toBe(IMAGE);
    expect(store.saved?.imageUrl).toBe(IMAGE);
  });

  it("survives Supabase being unreachable", async () => {
    expect(
      await loadAvatar(memoryStore(), async () => Promise.reject(new Error("offline"))),
    ).toBeNull();
  });
});

describe("backfillAvatar", () => {
  const mine: Avatar = { source: "preset", config: built as Avatar["config"] };

  it("uploads a local avatar Supabase doesn't have yet", async () => {
    const upload = vi.fn(async () => {});
    expect(await backfillAvatar(mine, member(), upload)).toBe(true);
    expect(upload).toHaveBeenCalledWith(mine);
  });

  it("leaves Supabase alone when it already has one", async () => {
    const upload = vi.fn();
    expect(await backfillAvatar(mine, member({ avatar_reference: IMAGE }), upload)).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("does nothing without a local avatar or a pair", async () => {
    const upload = vi.fn();
    expect(await backfillAvatar(null, member(), upload)).toBe(false);
    expect(await backfillAvatar(mine, null, upload)).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });
});
