"use client";

import { MicIcon, StopIcon } from "@/components/icons";
import { formatDuration } from "@/features/stories";
import type { RecorderState } from "@/hooks/useRecorder";

type Props = {
  state: RecorderState;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
};

const HINT: Record<RecorderState, string> = {
  idle: "Tap to tell your story",
  requesting: "Allow the microphone…",
  recording: "Tap again when you’re done",
  recorded: "Got it! Tap again to redo",
  denied: "Microphone is blocked",
  unsupported: "This browser can't record",
};

/**
 * The big round button that is the point of the home screen.
 *
 * Built in layers for depth: a breathing halo, a recessed well it sits in, and
 * a glossy domed face. Tap to start and tap to stop, including keyboard activation. This also
 * allows the microphone permission prompt to finish before recording starts.
 */
export function RecordButton({ state, elapsedMs, onStart, onStop }: Props) {
  const recording = state === "recording";
  const blocked = state === "denied" || state === "unsupported";

  const face = recording
    ? "from-rose-400 to-red-600 shadow-[0_18px_36px_-10px_rgb(220_38_38/0.7),inset_0_2px_0_rgb(255_255_255/0.45),inset_0_-8px_14px_rgb(127_29_29/0.35)]"
    : "from-orange-400 to-orange-600 shadow-[0_20px_40px_-12px_rgb(150_35_231/0.75),inset_0_2px_0_rgb(255_255_255/0.45),inset_0_-8px_14px_rgb(103_29_154/0.35)]";

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Sized from the space it is given (a size container, see RecordPage), so
          it shrinks on short phones instead of overlapping what is above it. */}
      <div className="relative grid size-[min(16rem,calc(100cqh_-_5.5rem),85cqw)] place-items-center">
        {/* Halo: breathes while idle, ripples while recording. */}
        <span
          aria-hidden="true"
          className={[
            "absolute inset-0 rounded-full",
            recording
              ? "animate-ping bg-red-400/30 motion-reduce:animate-none"
              : "animate-breathe bg-orange-300/40 motion-reduce:animate-none",
            blocked ? "hidden" : "",
          ].join(" ")}
        />
        {/* The well the button sits in. */}
        <span
          aria-hidden="true"
          className="absolute inset-[9%] rounded-full bg-linear-to-b from-orange-100 to-white shadow-[inset_0_6px_14px_rgb(103_29_154/0.18),0_1px_0_rgb(255_255_255)]"
        />

        <button
          type="button"
          disabled={state === "unsupported" || state === "requesting"}
          aria-label={recording ? "Stop recording" : "Start recording your story"}
          aria-pressed={recording}
          onClick={() => (recording ? onStop() : onStart())}
          onContextMenu={(event) => event.preventDefault()}
          className={[
            "relative grid size-[62%] touch-none place-items-center overflow-hidden rounded-full bg-linear-to-b text-white select-none",
            "transition-[transform,box-shadow] duration-150",
            "focus-visible:ring-4 focus-visible:ring-orange-300 focus-visible:outline-none",
            "disabled:from-stone-300 disabled:to-stone-400 disabled:shadow-none",
            recording ? "scale-95" : "hover:scale-[1.03] active:scale-95",
            face,
          ].join(" ")}
        >
          {/* Gloss across the top of the dome. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-[18%] top-[7%] h-[34%] rounded-full bg-linear-to-b from-white/50 to-white/0"
          />
          {recording ? (
            <StopIcon className="relative size-[34%] drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]" />
          ) : (
            <MicIcon className="relative size-[38%] drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]" />
          )}
        </button>
      </div>

      <div className="flex h-12 flex-col items-center justify-start">
        {recording ? (
          <p className="text-3xl font-black text-red-600 tabular-nums">
            {formatDuration(elapsedMs)}
          </p>
        ) : null}
        <p aria-live="polite" className="text-sm font-bold text-stone-500">
          {HINT[state]}
        </p>
        {state === "denied" && (
          <p className="mt-1 max-w-xs text-center text-xs text-red-600">
            Allow the mic in your browser settings, or switch to Type.
          </p>
        )}
      </div>
    </div>
  );
}
