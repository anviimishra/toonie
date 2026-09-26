import { createStubFeed } from "./stub";
import type { FeedAdapter } from "./types";

export type { FeedAdapter, FeedItem, FeedPanel, FeedSender, FeedStatus } from "./types";
export { formatRelativeTime } from "./time";
export { groupIntoRows, panelRows } from "./layout";
export { describeScene, hashString } from "./scene";
export type { SceneMood, SceneProp, SceneSetting, SceneSpec, SceneTime } from "./scene";

/**
 * The adapter the app uses. Swap this line when the real backend is ready;
 * no component imports the stub directly.
 */
export const feed: FeedAdapter = createStubFeed();
