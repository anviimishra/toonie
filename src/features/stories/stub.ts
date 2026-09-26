import type { CreatedStory, StoriesAdapter, StoryDraft } from "./types";

/**
 * Pretends to accept a story so the record screen can be built and demoed
 * before the pipeline exists.
 *
 * Replace with the real adapter -- POST /api/stories -- when the middle layer
 * lands. The screen imports StoriesAdapter, never this file directly.
 */
export function createStubStories(): StoriesAdapter {
  let counter = 0;

  return {
    async create(draft: StoryDraft): Promise<CreatedStory> {
      // A beat of latency, so the pending state is visible while building.
      await new Promise((resolve) => setTimeout(resolve, 600));
      counter += 1;
      const size = draft.mode === "talk" ? (draft.audio?.size ?? 0) : draft.text.length;
      console.info(
        `[stub] story ${counter}: ${draft.mode}, ${draft.panelCount} panels, ${size} bytes`,
      );
      return { id: `stub-story-${counter}`, status: "transcribing" };
    },
  };
}
