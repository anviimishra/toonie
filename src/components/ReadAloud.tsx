"use client";

import { useEffect, useRef, useState } from "react";
import { getVoiceover, type Voiceover } from "@/features/family/client";
import { languageLabel } from "@/features/settings/languages";

/**
 * On the child's tablet: a story from the grown-up, translated into the
 * child's language and read aloud in the grown-up's voice (if they turned it
 * on). Starts playing as soon as it's ready.
 */
export function ReadAloud({ messageId }: { messageId: string }) {
  const [voiceover, setVoiceover] = useState<Voiceover | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    setVoiceover(null);
    setProblem(null);
    getVoiceover(messageId)
      .then((result) => active && setVoiceover(result))
      .catch((error) => {
        console.warn("[read-aloud]", error);
        if (active)
          setProblem(error instanceof Error ? error.message : "Couldn't get the story ready.");
      });
    return () => {
      active = false;
    };
  }, [messageId]);

  // Opening the story was a tap, so most browsers allow playing straight away.
  // If not, the player's own play button is right there.
  useEffect(() => {
    if (voiceover?.audioUrl) audio.current?.play().catch(() => {});
  }, [voiceover?.audioUrl]);

  if (problem) {
    return (
      <p role="alert" className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600">
        {problem}
      </p>
    );
  }

  if (!voiceover) {
    return (
      <p aria-busy="true" className="rounded-2xl bg-orange-50 p-4 font-extrabold text-orange-700">
        Getting your story ready…
      </p>
    );
  }

  return (
    <section
      aria-label="Your story, read aloud"
      className="space-y-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100"
    >
      {voiceover.audioUrl && (
        <audio ref={audio} controls src={voiceover.audioUrl} className="w-full">
          <track kind="captions" />
        </audio>
      )}
      <p className="text-lg leading-relaxed font-bold whitespace-pre-wrap text-stone-800">
        {voiceover.text}
      </p>
      <p className="text-xs font-extrabold tracking-[0.2em] text-orange-500 uppercase">
        {languageLabel(voiceover.language)}
      </p>
    </section>
  );
}
