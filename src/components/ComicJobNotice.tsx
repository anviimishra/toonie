"use client";
import Link from "next/link";
import { useComicJob } from "@/features/stories/useComicJob";
export function ComicJobNotice() {
  const { job } = useComicJob();
  if (!job) return null;
  return (
    <Link href="/" className="mx-4 mt-4 block rounded-xl border border-purple-200 bg-white p-4">
      <strong>
        {job.status === "ready"
          ? "Your comic is ready to review"
          : job.status === "failed"
            ? "Your comic needs another try"
            : "Your comic is being made"}
      </strong>
      <span className="mt-1 block text-sm">
        {job.status === "working"
          ? `${job.stage} ${job.drawn}/${job.panel_count} panels finished. You can keep browsing.`
          : "Open your studio"}
      </span>
    </Link>
  );
}
