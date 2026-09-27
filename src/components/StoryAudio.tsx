"use client";
import { useEffect, useState } from "react";

export function StoryAudio({ audio }: { audio: Blob }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(audio);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [audio]);
  return (
    <div className="my-4">
      <p className="mb-2 text-sm font-bold">Original voice recording</p>
      <audio controls src={url} className="w-full" aria-label="Original voice recording" />
    </div>
  );
}
