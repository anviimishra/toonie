import { normalizeAvatar } from "./config";
import { checkPhoto, photoToDataUrl } from "./photo";
import { presetForSeed } from "./presets";
import type { Avatar, AvatarAdapter } from "./types";

/**
 * Stand-in avatars for development, kept until storage and the image model
 * are wired up.
 *
 * Keeps one avatar in localStorage and fakes the selfie-to-avatar step. The
 * Me screen goes through AvatarAdapter, so replacing this file is the whole
 * migration.
 */

const KEY = "toonie.avatar";

/** Long enough to enjoy the generating animation, short enough to demo. */
const GENERATE_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function write(avatar: Avatar): void {
  window.localStorage.setItem(KEY, JSON.stringify(avatar));
}

export function createStubAvatars(): AvatarAdapter {
  return {
    async get() {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(KEY);
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

      // STUB. The real adapter uploads the photo and calls Grok's image model
      // with it as a reference image, asking for our cartoon style, then
      // returns the drawn picture as `imageUrl` (plus the config we store
      // alongside it). Here we just wait, keep a thumbnail of the selfie and
      // pick a preset that is stable for the same photo.
      const [photoDataUrl] = await Promise.all([
        photoToDataUrl(file).catch(() => undefined),
        wait(GENERATE_DELAY_MS),
      ]);
      const preset = presetForSeed(`${file.name}:${file.size}:${file.lastModified}`);

      const avatar: Avatar = { source: "photo", config: { ...preset.config } };
      if (photoDataUrl) avatar.photoDataUrl = photoDataUrl;
      return avatar;
    },
  };
}
