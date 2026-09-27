"use client";

import { useEffect, useState } from "react";
import { SparkleIcon } from "@/components/icons";
import { PencilIcon } from "./icons";

const STEPS = [
  "Looking at your smile…",
  "Picking your colours…",
  "Drawing your hair…",
  "Adding some sparkle…",
];

/** Twinkles placed around the rim, as [top%, left%, delay s, size class]. */
const TWINKLES: [number, number, number, string][] = [
  [2, 18, 0, "size-5"],
  [12, 86, 0.4, "size-4"],
  [70, 94, 0.8, "size-5"],
  [88, 10, 0.2, "size-4"],
  [44, -4, 1, "size-3"],
];

/**
 * What the stage shows while the selfie becomes a cartoon: the photo fades to
 * a sketch, a light sweeps over it, a pencil scribbles and sparkles twinkle
 * around the rim, while a line underneath says what it's "doing".
 */
export function GeneratingAvatar({ photoUrl }: { photoUrl: string | null }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-52 place-items-center">
        <span
          aria-hidden="true"
          className="animate-breathe absolute inset-0 rounded-full bg-orange-300/50 motion-reduce:animate-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-1 animate-[spin_6s_linear_infinite] rounded-full border-4 border-dashed border-orange-300 motion-reduce:animate-none"
        />
        <div className="relative size-44 overflow-hidden rounded-full bg-white p-1.5 shadow-card ring-1 ring-orange-100">
          <div className="relative size-full overflow-hidden rounded-full bg-orange-100">
            {photoUrl && (
              // A local object URL; next/image can't optimise those.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="size-full object-cover opacity-80 contrast-125 grayscale sepia"
              />
            )}
            <span
              aria-hidden="true"
              className="me-sweep absolute inset-x-0 top-0 h-full bg-linear-to-b from-transparent via-white/70 to-transparent"
            />
          </div>
        </div>
        <span
          aria-hidden="true"
          className="me-scribble absolute right-6 bottom-6 grid size-12 place-items-center rounded-full bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised"
        >
          <PencilIcon className="size-6" />
        </span>
        {TWINKLES.map(([top, left, delay, size]) => (
          <SparkleIcon
            key={`${top}-${left}`}
            className={`me-twinkle absolute text-amber-400 ${size}`}
            style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <p role="status" className="text-base font-extrabold text-orange-600">
        <span className="sr-only">Making your avatar.</span>
        <span aria-hidden="true">{STEPS[step]}</span>
      </p>
    </div>
  );
}
