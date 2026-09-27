import { sentComic, sentComics } from "@/features/stories/storage";
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
const examples = createStubFeed();
export const feed: FeedAdapter = {
  async list() {
    const [sent, received] = await Promise.all([sentComics(), examples.list()]);
    return [...sent, ...received].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  async get(id) {
    return (await sentComic(id)) ?? examples.get(id);
  },
  async markSeen(id) {
    await examples.markSeen(id);
  },
};
