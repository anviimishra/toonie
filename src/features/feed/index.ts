import { getMessages, markRead } from "@/features/messages/client";
import type { FeedAdapter } from "./types";

export type { FeedAdapter, FeedItem, FeedPanel, FeedSender, FeedStatus } from "./types";
export { formatRelativeTime } from "./time";
export { groupIntoRows, panelRows } from "./layout";
export { describeScene, hashString } from "./scene";
export type { SceneMood, SceneProp, SceneSetting, SceneSpec, SceneTime } from "./scene";

export const feed: FeedAdapter = {
  list: () => getMessages(),
  async get(id) {
    return (await getMessages(false, id))[0] ?? null;
  },
  async markSeen(id) {
    await markRead(id);
  },
};
