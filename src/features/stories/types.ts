/** How a story was captured. */
export type DraftMode = "talk" | "type";

/** What the record screen collects before anything is sent. */
export type StoryDraft = {
  mode: DraftMode;
  /** Present when mode is "talk". */
  audio: Blob | null;
  /** Present when mode is "type". */
  text: string;
  panelCount: number;
};

export type StoryStatus = "transcribing" | "scripting" | "drawing" | "ready" | "failed";

/** What comes back once a story is accepted for processing. */
export type CreatedStory = {
  id: string;
  status: StoryStatus;
};

/**
 * The seam between the record screen and whatever actually creates a story.
 *
 * The screen only knows this interface, so the real implementation can land
 * underneath without touching any component.
 */
export interface StoriesAdapter {
  create(draft: StoryDraft): Promise<CreatedStory>;
}
