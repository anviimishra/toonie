"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api-client";
import type { ComicJob } from "./jobs";
import type { StorySource } from "./submission";
export function useComicJob(child = false) {
  const revision = useRef(0);
  const mounted = useRef(true);
  const [job, setJob] = useState<ComicJob | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const mine = ++revision.current;
    const result = await apiJson<{ job: ComicJob | null }>("/api/comic-jobs", {}, child);
    if (mounted.current && mine === revision.current) {
      setJob(result.job);
      setError("");
    }
    return result.job;
  }, [child]);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    const check = async () => {
      const mine = ++revision.current;
      try {
        const result = await apiJson<{ job: ComicJob | null }>("/api/comic-jobs", {}, child);
        if (active && mine === revision.current) {
          setJob(result.job);
          setError("");
        }
      } catch (e) {
        if (active && mine === revision.current)
          setError(e instanceof Error ? e.message : "Couldn't check your comic.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 5000);
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [child]);
  const start = useCallback(
    async (form: FormData) => {
      await apiJson<{ id: string }>(
        "/api/comics?background=1",
        { method: "POST", body: form },
        child,
      );
      await refresh();
    },
    [child, refresh],
  );
  const jobId = job?.id;
  const dismiss = useCallback(async () => {
    ++revision.current;
    if (jobId) await apiJson(`/api/comic-jobs?id=${jobId}`, { method: "DELETE" }, child);
    ++revision.current;
    if (mounted.current) setJob(null);
  }, [child, jobId]);
  return { job, loading, error, start, dismiss, refresh };
}
export async function jobSource(job: ComicJob): Promise<StorySource> {
  if (!job.audioUrl)
    return { kind: "text", audio: null, durationMs: null, originalTranscript: null };
  const response = await fetch(job.audioUrl);
  if (!response.ok) throw new Error("Couldn't restore your recording. Please reopen the comic.");
  const bytes = await response.arrayBuffer();
  return {
    kind: "voice",
    audio: new Blob([bytes], { type: job.audio_type ?? "audio/webm" }),
    durationMs: job.audio_duration_ms,
    originalTranscript: job.original_transcript,
  };
}
