import { z } from "zod";
import { PANEL_COUNT_MAX, PANEL_COUNT_MIN, panelSchema } from "./story";

/**
 * What the comic pipeline returns, and the progress events it streams while
 * it works. Shared by POST /api/comics and the record screen.
 */

/** The script with a title, as the text model writes it. */
export const titledScriptSchema = z.object({
  title: z.string().min(1).max(80),
  /**
   * One sentence describing how each recurring character looks, repeated in
   * every image prompt so the same people appear in every panel.
   */
  cast: z.string().min(1).max(400),
  panels: z
    .array(
      panelSchema.extend({
        dialogue: z
          .array(z.object({ speaker: z.string().min(1).max(40), text: z.string().min(1).max(120) }))
          .max(2)
          .optional(),
      }),
    )
    .min(PANEL_COUNT_MIN)
    .max(PANEL_COUNT_MAX),
});

export type TitledScript = z.infer<typeof titledScriptSchema>;

export type ComicPanelResult = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string }[];
  /** Missing when that one panel failed to draw. */
  imageUrl?: string;
};

export type Comic = {
  readingVersion?: 1 | 2;
  stickerPanels?: ComicPanelResult[];
  format?: "sticker";
  title: string;
  transcript: string;
  panels: ComicPanelResult[];
};

/**
 * Streamed one per line (NDJSON) so the screen can show real progress:
 * the words appear, then the captions, then each picture as it lands.
 */
export type ComicEvent =
  | { type: "transcribed"; transcript: string }
  | {
      type: "scripted";
      edition?: "reading" | "sticker";
      title: string;
      panels: { scene: string; caption: string }[];
    }
  | { type: "panel"; edition?: "reading" | "sticker"; index: number; imageUrl: string }
  | { type: "panel_failed"; edition?: "reading" | "sticker"; index: number; message: string }
  | { type: "done"; comic: Comic }
  | { type: "error"; message: string };
