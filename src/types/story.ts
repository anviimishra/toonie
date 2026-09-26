import { z } from "zod";

/**
 * Story and comic DTOs shared by the app, the API, and the robot client.
 *
 * These are zod schemas rather than bare types so the same definition both
 * describes the contract and validates it at the edge, per the conventions in
 * docs/plan.md.
 */

/** The UI offers 1-6 panels; the database enforces the same range. */
export const PANEL_COUNT_MIN = 1;
export const PANEL_COUNT_MAX = 6;

/** Thermal paper is 58mm, which is 384 dots on the printers we target. */
export const PRINT_WIDTH_PX = 384;

/**
 * Arrives as a string from a multipart form, so coerce before validating.
 */
export const panelCountSchema = z.coerce.number().int().min(PANEL_COUNT_MIN).max(PANEL_COUNT_MAX);

/** One panel of the script the LLM returns: what to draw, and the words under it. */
export const panelSchema = z.object({
  scene: z.string().min(1),
  caption: z.string(),
});

/** Shape stored in stories.script_json. */
export const storyScriptSchema = z.object({
  panels: z.array(panelSchema).min(PANEL_COUNT_MIN).max(PANEL_COUNT_MAX),
});

export type Panel = z.infer<typeof panelSchema>;
export type StoryScript = z.infer<typeof storyScriptSchema>;
