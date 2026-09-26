import { createStubStories } from "./stub";
import type { StoriesAdapter } from "./types";

export type { CreatedStory, DraftMode, StoriesAdapter, StoryDraft, StoryStatus } from "./types";
export {
  PANEL_COUNT_DEFAULT,
  PANEL_COUNT_MAX,
  PANEL_COUNT_MIN,
  checkDraft,
  formatDuration,
} from "./draft";

/**
 * The adapter the app uses. Swap this line when the real pipeline is ready;
 * no component imports the stub directly.
 */
export const stories: StoriesAdapter = createStubStories();
