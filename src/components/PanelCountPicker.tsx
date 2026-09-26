"use client";

import { PANEL_COUNT_MAX, PANEL_COUNT_MIN } from "@/features/stories";

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const COUNTS = Array.from(
  { length: PANEL_COUNT_MAX - PANEL_COUNT_MIN + 1 },
  (_, index) => PANEL_COUNT_MIN + index,
);

/**
 * How many panels the comic should have.
 *
 * A radiogroup rather than a select: it is one tap on a phone, and seeing all
 * six options makes the choice obvious to a child.
 */
export function PanelCountPicker({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset disabled={disabled} className="w-full">
      <legend className="text-muted mb-2 text-center text-sm font-bold">How many panels?</legend>
      <div role="radiogroup" aria-label="Panel count" className="flex justify-center gap-2">
        {COUNTS.map((count) => {
          const selected = count === value;
          return (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(count)}
              className={[
                "h-12 w-12 rounded-2xl text-lg font-extrabold transition",
                "focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none",
                "disabled:opacity-40",
                selected
                  ? "bg-accent text-accent-foreground scale-105"
                  : "border border-stone-300 bg-white hover:bg-stone-50",
              ].join(" ")}
            >
              {count}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
