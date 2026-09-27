import type { Panel } from "@/types";

/** One panel of a received comic: the same shape the script uses. */
export type FeedPanel = Panel & {
  /** The drawn image, once the real pipeline makes one. Until then we draw our own. */
  imageUrl?: string;
};

export type FeedSender = {
  name: string;
  /** Any CSS colour. Tints the sender's avatar bubble. */
  color: string;
};

export type FeedStatus = "new" | "seen";

/** A comic someone sent you. */
export type FeedItem = {
  id: string;
  sender: FeedSender;
  title: string;
  /** ISO 8601. */
  createdAt: string;
  status: FeedStatus;
  panels: FeedPanel[];
};

/**
 * The seam between the feed screens and wherever received comics live.
 *
 * The screens only know this interface, so the real backend can land
 * underneath without touching any component.
 */
export interface FeedAdapter {
  /** Newest first. */
  list(): Promise<FeedItem[]>;
  get(id: string): Promise<FeedItem | null>;
  markSeen(id: string): Promise<void>;
}
