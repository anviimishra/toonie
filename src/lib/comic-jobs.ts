import { randomUUID } from "node:crypto";
import { makeComic, type ComicRequest } from "@/lib/ai/pipeline";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiError } from "@/lib/server-auth";
import { READING_PANEL_COUNT, type Comic } from "@/types";
import type { Json } from "@/lib/supabase/types";
const bucket = "comic-drafts";
export async function createComicJob(userId: string, input: ComicRequest, duration: number | null) {
  const db = supabaseServer();
  const id = randomUUID();
  const { error } = await db.from("comic_jobs").insert({
    id,
    user_id: userId,
    status: "working",
    stage: "Preparing your story…",
    panel_count:
      input.outputMode === "dual"
        ? READING_PANEL_COUNT + Math.max(3, input.panelCount)
        : input.outputMode === "reading"
          ? READING_PANEL_COUNT
          : input.panelCount,
    audio_duration_ms: duration,
  });
  if (error?.code === "23505")
    throw new ApiError(
      409,
      "You already have a comic in progress or ready to review. Return to your comic first.",
    );
  if (error) throw error;
  if (input.kind === "audio") {
    const path = `${userId}/${id}/voice`;
    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(path, input.audio, { contentType: input.audio.type, upsert: false });
    if (uploadError) {
      await db
        .from("comic_jobs")
        .update({ status: "failed", error: "Recording upload failed. Please try again." })
        .eq("id", id);
      throw uploadError;
    }
    const { error: updateError } = await db
      .from("comic_jobs")
      .update({ audio_path: path, audio_type: input.audio.type })
      .eq("id", id);
    if (updateError) throw updateError;
  }
  return id;
}
export async function runComicJob(id: string, userId: string, input: ComicRequest) {
  const db = supabaseServer();
  let updates = Promise.resolve(),
    drawn = 0;
  const paths: string[] = [];
  const stickerPaths: string[] = [];
  async function update(
    values: import("@/lib/supabase/messages.types").MessagingTables["comic_jobs"]["Update"],
  ) {
    const { error } = await db
      .from("comic_jobs")
      .update(values)
      .eq("id", id)
      .eq("status", "working");
    if (error) throw error;
  }
  try {
    await makeComic(input, (event) => {
      // Serialize progress writes so slow network responses cannot move status backwards.
      updates = updates.then(async () => {
        if (event.type === "transcribed")
          await update({ original_transcript: event.transcript, stage: "Writing your comic…" });
        if (event.type === "scripted") await update({ stage: "Drawing your panels…" });
        if (event.type === "panel") {
          const path = `${userId}/${id}/${event.edition ?? "panel"}-${event.index}.jpg`;
          const bytes = Buffer.from(event.imageUrl.split(",")[1], "base64");
          const { error } = await db.storage
            .from(bucket)
            .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
          if (error) throw error;
          (event.edition === "sticker" ? stickerPaths : paths)[event.index] = path;
          await update({ drawn: ++drawn, stage: "Drawing your panels…" });
        }
        if (event.type === "error")
          await update({
            status: "failed",
            error: event.message,
            stage: "Comic needs another try",
          });
        if (event.type === "done") {
          const comic: Comic = {
            ...event.comic,
            stickerPanels: event.comic.stickerPanels?.map((panel, index) => ({
              ...panel,
              imageUrl: stickerPaths[index],
            })),
            panels: event.comic.panels.map((panel, index) => ({
              ...panel,
              imageUrl: paths[index],
            })),
          };
          await update({
            status: "ready",
            stage: "Ready to review",
            result: comic as unknown as Json,
          });
        }
      });
      // Avoid unhandled rejections while the provider is still drawing other panels.
      void updates.catch(() => {});
    });
    await updates;
  } catch {
    await db
      .from("comic_jobs")
      .update({
        status: "failed",
        error: "Couldn't save the finished comic. Please try again.",
        stage: "Comic needs another try",
      })
      .eq("id", id)
      .eq("status", "working");
  }
}
export async function currentComicJob(userId: string) {
  const db = supabaseServer();
  // A deployment/crashed worker must never leave an endless loading screen.
  const { error: staleError } = await db
    .from("comic_jobs")
    .update({
      status: "failed",
      error: "Generation took too long or was interrupted. Please try again.",
      stage: "Comic needs another try",
    })
    .eq("user_id", userId)
    .eq("status", "working")
    .lt("created_at", new Date(Date.now() - 360000).toISOString());
  if (staleError) throw staleError;
  const { data: job, error } = await db
    .from("comic_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;
  async function signed(path: string) {
    if (!path.startsWith(`${userId}/${job!.id}/`)) throw new Error("Invalid draft path");
    const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  const comic = job.result as unknown as Comic | null;
  const rendered = comic
    ? {
        ...comic,
        stickerPanels: comic.stickerPanels
          ? await Promise.all(
              comic.stickerPanels.map(async (panel) => ({
                ...panel,
                imageUrl: await signed(panel.imageUrl!),
              })),
            )
          : undefined,
        panels: await Promise.all(
          comic.panels.map(async (panel) => ({
            ...panel,
            imageUrl: await signed(panel.imageUrl!),
          })),
        ),
      }
    : undefined;
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    drawn: job.drawn,
    panel_count: job.panel_count,
    error: job.error,
    comic: rendered,
    audioUrl: job.audio_path ? await signed(job.audio_path) : undefined,
    audio_type: job.audio_type,
    audio_duration_ms: job.audio_duration_ms,
    original_transcript: job.original_transcript,
  };
}
