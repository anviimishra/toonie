import type { Comic } from "@/types";
import type { FeedItem } from "@/features/feed/types";

import { type StorySource, type PreparedStory, submissionFormData } from "./submission";
export type ComicDraft = {
  id: string;
  comic: Comic;
  source?: StorySource;
  submission?: PreparedStory;
};

// IndexedDB accommodates full-resolution images without localStorage's small quota.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("toonie-comics", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts");
      request.result.createObjectStore("sent", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Couldn't open comic storage in this browser."));
  });
}

async function transaction<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("Couldn't save the comic. Check available browser storage and try again."));
    };
  });
}

export const loadDraft = () =>
  transaction<ComicDraft | undefined>("drafts", "readonly", (store) => store.get("current"));
export const saveDraft = (draft: ComicDraft) =>
  transaction("drafts", "readwrite", (store) => store.put(draft, "current"));
export async function clearDraft() {
  await transaction("drafts", "readwrite", (store) => store.delete("current"));
  await transaction("drafts", "readwrite", (store) => store.delete("input"));
}
export const sentComics = () =>
  transaction<FeedItem[]>("sent", "readonly", (store) => store.getAll());
export const sentComic = (id: string) =>
  transaction<FeedItem | undefined>("sent", "readonly", (store) => store.get(id));

export async function sendToFeed(draft: ComicDraft, name: string): Promise<void> {
  if (draft.comic.panels.some((panel) => !panel.imageUrl))
    throw new Error("Finish every panel before sending.");
  if (draft.submission) submissionFormData(draft.submission);
  if (draft.comic.format === "sticker" && !draft.submission)
    throw new Error("Prepare the comic files before sending.");
  const item: FeedItem = {
    audio: draft.source?.audio ?? null,
    id: draft.id,
    format: draft.comic.format,
    transcript: draft.comic.transcript,
    title: draft.comic.title,
    panels: draft.comic.panels,
    sender: { name, color: "#d59bfd" },
    status: "seen",
    direction: "sent",
    createdAt: new Date().toISOString(),
  };
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["drafts", "sent"], "readwrite");
    tx.objectStore("sent").put(item);
    tx.objectStore("drafts").delete("current");
    tx.objectStore("drafts").delete("input");
    if (draft.submission) tx.objectStore("drafts").put(draft.submission, `submission:${draft.id}`);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error("Couldn't save to your feed. Your preview is still here; please try again."),
      );
    };
  });
}

/** Durable upload payload for the future authenticated delivery adapter. */
export const getPreparedStory = (id: string) =>
  transaction<PreparedStory | undefined>("drafts", "readonly", (store) =>
    store.get(`submission:${id}`),
  );
export async function getSubmissionFormData(id: string) {
  const story = await getPreparedStory(id);
  if (!story) throw new Error("No prepared files exist for this comic.");
  return submissionFormData(story);
}

export const saveInput = (input: { text: string; source: StorySource }) =>
  transaction("drafts", "readwrite", (store) => store.put(input, "input"));
export const loadInput = () =>
  transaction<{ text: string; source: StorySource } | undefined>("drafts", "readonly", (store) =>
    store.get("input"),
  );
