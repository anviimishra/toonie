import type { StoryDraft } from "./types";

/**
 * Panel bounds. These also exist as a zod schema in src/types (PR #4) and as a
 * check constraint in the migration; fold them together once that merges.
 */
export const PANEL_COUNT_MIN = 1;
export const PANEL_COUNT_MAX = 6;
export const PANEL_COUNT_DEFAULT = 4;

/** Below this a story is too short to make a comic out of. */
export const MIN_TEXT_LENGTH = 10;

/** Below this the recording was almost certainly a mis-tap. */
export const MIN_RECORDING_MS = 1000;

export type DraftCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether a draft can be sent, and if not, something a person can act on.
 * Pure, so the record screen stays free of validation logic.
 */
export function checkDraft(draft: StoryDraft, recordedMs = 0): DraftCheck {
  if (!Number.isInteger(draft.panelCount)) {
    return { ok: false, reason: "Pick how many panels you want." };
  }
  if (draft.panelCount < PANEL_COUNT_MIN || draft.panelCount > PANEL_COUNT_MAX) {
    return {
      ok: false,
      reason: `Pick between ${PANEL_COUNT_MIN} and ${PANEL_COUNT_MAX} panels.`,
    };
  }

  if (draft.mode === "talk") {
    if (!draft.audio || draft.audio.size === 0) {
      return { ok: false, reason: "Hold the button and tell your story first." };
    }
    if (recordedMs < MIN_RECORDING_MS) {
      return { ok: false, reason: "That was too short. Try telling a bit more." };
    }
    return { ok: true };
  }

  if (draft.text.trim().length < MIN_TEXT_LENGTH) {
    return { ok: false, reason: "Write a little more so we have something to draw." };
  }
  return { ok: true };
}

/** mm:ss for the recording timer. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
