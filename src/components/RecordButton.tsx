"use client";

import type { RecorderState } from "@/hooks/useRecorder";
import { formatDuration } from "@/features/stories";

type Props = {
  state: RecorderState;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
};

const LABEL: Record<RecorderState, string> = {
  idle: "Hold to talk",
  requesting: "Let us hear you…",
  recording: "Listening…",
  recorded: "Hold to try again",
  denied: "Microphone blocked",
  unsupported: "Recording not supported",
};

/**
 * The big round button that is the whole point of the home screen.
 *
 * Hold to record, release to stop. Pointer events cover mouse, touch and pen
 * in one path; `onPointerLeave` stops a recording if a finger slides off the
 * button, which otherwise leaves it recording forever.
 */
export function RecordButton({ state, elapsedMs, onStart, onStop }: Props) {
  const recording = state === "recording";
  const blocked = state === "denied" || state === "unsupported";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={blocked}
        aria-label={LABEL[state]}
        aria-pressed={recording}
        onPointerDown={(event) => {
          event.preventDefault();
          if (!blocked) onStart();
        }}
        onPointerUp={() => recording && onStop()}
        onPointerLeave={() => recording && onStop()}
        onPointerCancel={() => recording && onStop()}
        className={[
          "relative grid h-44 w-44 place-items-center rounded-full",
          "text-xl font-extrabold text-accent-foreground select-none",
          "transition-transform duration-150 disabled:opacity-40",
          "focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none",
          recording ? "scale-95 bg-red-500" : "bg-accent hover:brightness-110 active:scale-95",
        ].join(" ")}
      >
        {/* A pulse, so it is obvious at a glance that it is live. */}
        {recording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40 motion-reduce:animate-none" />
        )}
        <span className="relative">{recording ? formatDuration(elapsedMs) : "Hold"}</span>
      </button>

      <p aria-live="polite" className="text-muted text-sm font-semibold">
        {LABEL[state]}
      </p>

      {state === "denied" && (
        <p className="max-w-xs text-center text-sm text-red-600">
          Let this page use your microphone in your browser settings, then try again. You can also
          type your story instead.
        </p>
      )}
      {state === "unsupported" && (
        <p className="max-w-xs text-center text-sm text-red-600">
          This browser cannot record audio. Type your story instead.
        </p>
      )}
    </div>
  );
}
