import { apiJson, jsonBody } from "@/lib/api-client";
import { supabaseBrowser, supabaseChild } from "@/lib/supabase/client";
import type { ParentChildPair } from "@/lib/supabase/types";
import type { FeedItem } from "@/features/feed/types";
import { BUCKET_MESSAGE_MEDIA } from "@/lib/supabase/types";
import { submissionFormData, type PreparedStory } from "@/features/stories/submission";
import { deliverySchema } from "./contract";
export const getPairs = async (child = false) =>
  (await apiJson<{ pairs: ParentChildPair[] }>("/api/pairs", {}, child)).pairs;
export const getMessages = async (child = false, id?: string) =>
  (
    await apiJson<{ items: FeedItem[] }>(
      `/api/messages${id ? `?id=${encodeURIComponent(id)}` : ""}`,
      {},
      child,
    )
  ).items;
export const markRead = (id: string, child = false) =>
  apiJson("/api/messages/read", jsonBody({ id }), child);
async function fingerprint(blob: Blob) {
  return {
    type: blob.type,
    size: blob.size,
    sha256: Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
      (x) => x.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function deliverStory(story: PreparedStory, pairId: string, child = false) {
  submissionFormData(story);
  const input = deliverySchema.parse({
    id: story.id,
    pairId,
    title: story.title,
    transcript: story.transcript,
    originalTranscript: story.source.originalTranscript,
    audioDurationMs: story.source.durationMs,
    panelCount: story.panelCount,
    comic: await fingerprint(story.colorImage),
    print: story.printImage ? await fingerprint(story.printImage) : null,
    thumbnail: story.thumbnailImage ? await fingerprint(story.thumbnailImage) : undefined,
    audio: story.source.audio ? await fingerprint(story.source.audio) : null,
  });
  const prepared = await apiJson<{
    sent: boolean;
    id?: string;
    ticket: string;
    uploads: { key: "comic" | "print" | "audio" | "thumbnail"; path: string; token: string }[];
  }>("/api/messages/prepare", jsonBody(input), child);
  if (prepared.sent) return story.id;
  const client = child ? supabaseChild() : supabaseBrowser();
  for (const upload of prepared.uploads) {
    const blob =
      upload.key === "thumbnail"
        ? story.thumbnailImage!
        : upload.key === "comic"
          ? story.colorImage
          : upload.key === "print"
            ? story.printImage!
            : story.source.audio!;
    const { error } = await client.storage
      .from(BUCKET_MESSAGE_MEDIA)
      .uploadToSignedUrl(upload.path, upload.token, blob, {
        contentType: blob.type,
        upsert: false,
      });
    // Duplicate paths are possible on retries; finalization verifies the existing bytes.
    if (error && !/already exists|duplicate|resource already/i.test(error.message))
      throw new Error("File upload failed. Please send again.");
  }
  await apiJson("/api/messages/send", jsonBody({ ticket: prepared.ticket }), child);
  return story.id;
}
export function watchMessages(refresh: () => void, child = false) {
  const client = child ? supabaseChild() : supabaseBrowser();
  const channel = client
    .channel(`messages:${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "comic_messages" }, refresh)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") refresh();
    });
  const timer = setInterval(refresh, 30000);
  const visible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  window.addEventListener("online", refresh);
  document.addEventListener("visibilitychange", visible);
  return () => {
    clearInterval(timer);
    window.removeEventListener("online", refresh);
    document.removeEventListener("visibilitychange", visible);
    void client.removeChannel(channel);
  };
}
