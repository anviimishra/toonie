import { normalizeAvatar } from "./config";
import { checkPhoto, photoToDataUrl } from "./photo";
import { DEFAULT_AVATAR_CONFIG } from "./config";
import type { Avatar, AvatarAdapter } from "./types";
/** Where the grown-up's own avatar is kept. */
export const AVATAR_KEY = "toonie.avatar";
/** Where the child's avatar is kept. */
export const CHILD_AVATAR_KEY = "toonie.child-avatar";

/**
 * Browser-local avatar persistence with real Grok photo generation. One
 * stored avatar per key, so the grown-up and the child each get their own.
 */
export function createLocalAvatars(key: string = AVATAR_KEY): AvatarAdapter {
  function write(avatar: Avatar): void {
    window.localStorage.setItem(key, JSON.stringify(avatar));
  }

  return {
    async get() {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      try {
        return normalizeAvatar(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async save(avatar) {
      const clean = normalizeAvatar(avatar);
      if (!clean) throw new Error("Not a valid avatar");
      if (typeof window === "undefined") return;
      try {
        write(clean);
      } catch (error) {
        // Storage full: the photo is the big part and only nice-to-have here,
        // so keep the avatar without it rather than lose the whole thing.
        if (!clean.photoDataUrl) throw error;
        const withoutPhoto: Avatar = { ...clean };
        delete withoutPhoto.photoDataUrl;
        write(withoutPhoto);
      }
    },
    async generateFromPhoto(file) {
      const check = checkPhoto(file);
      if (!check.ok) throw new Error(check.reason);
      const photoDataUrl = await photoToDataUrl(file, 768);
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoDataUrl }),
      });
      const result = await response.json();
      if (!response.ok || !result.imageUrl)
        throw new Error(result.error ?? "Couldn't draw your avatar.");
      // Keep a compact, permanent reference in localStorage, not an expiring provider URL.
      const imageBlob = await (await fetch(result.imageUrl)).blob();
      const imageUrl = await photoToDataUrl(imageBlob, 512);
      return { source: "photo", config: { ...DEFAULT_AVATAR_CONFIG }, imageUrl };
    },
  };
}
