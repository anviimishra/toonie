import type { Comic } from "@/types";
export type ComicJob = {
  id: string;
  status: "working" | "ready" | "failed";
  stage: string;
  drawn: number;
  panel_count: number;
  error: string | null;
  comic?: Comic;
  audioUrl?: string;
  audio_type: string | null;
  audio_duration_ms: number | null;
  original_transcript: string | null;
};
