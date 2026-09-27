"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { CheckIcon } from "./icons";

type Option<T extends string> = { value: T; label: string };

/**
 * - text: a pill with words, orange when chosen (like the panel count chips).
 * - swatch: a round colour sample.
 * - tile: a rounded square holding a picture, such as a little avatar.
 */
type Variant = "text" | "swatch" | "tile";

type Props<T extends string> = {
  label: string;
  /** Shown at the right of the heading, e.g. the chosen option's name. */
  valueLabel?: string;
  options: readonly Option<T>[];
  /** null when nothing in this group matches (e.g. a customised preset). */
  value: T | null;
  onChange: (value: T) => void;
  columns: number;
  variant: Variant;
  /** What to draw inside a swatch or tile. Text chips show the label. */
  renderChip?: (option: Option<T>, selected: boolean) => ReactNode;
  /** Extra line under a tile's picture. */
  showTileLabel?: boolean;
};

const NEXT: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const RAISED =
  "bg-white shadow-chip hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none";
const SUNK =
  "translate-y-0.5 bg-orange-50 shadow-[inset_0_2px_5px_rgb(154_52_18/0.22)] ring-3 ring-orange-500";

/**
 * A labelled row of one-tap choices that behaves as a real radio group:
 * one tab stop, arrow keys move and choose, Home and End jump. Unchosen chips
 * are raised; the chosen one sinks in and gets a check, so the choice never
 * relies on colour alone.
 */
export function ChipRadioGroup<T extends string>({
  label,
  valueLabel,
  options,
  value,
  onChange,
  columns,
  variant,
  renderChip,
  showTileLabel = false,
}: Props<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  // With nothing chosen, the first chip takes the tab stop.
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key in NEXT) next = (index + NEXT[event.key] + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <fieldset className="w-full">
      <legend className="mb-2.5 flex w-full items-baseline justify-between text-sm font-extrabold text-stone-600">
        <span>{label}</span>
        {valueLabel && <span className="text-xs font-bold text-stone-400">{valueLabel}</span>}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={option.value}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={[
                "relative transition-all duration-150 motion-reduce:transition-none",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-orange-400",
                variant === "text" &&
                  [
                    "rounded-full px-3 py-2.5 text-sm font-extrabold",
                    selected
                      ? "translate-y-0.5 bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised-pressed"
                      : `${RAISED} text-stone-700`,
                  ].join(" "),
                variant === "swatch" &&
                  `aspect-square rounded-full p-1 ${selected ? SUNK : RAISED}`,
                variant === "tile" &&
                  `flex flex-col items-center gap-1 rounded-2xl p-1.5 ${selected ? SUNK : RAISED}`,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {variant === "text" ? option.label : renderChip?.(option, selected)}
              {variant === "tile" && showTileLabel && (
                <span
                  className={[
                    "text-[11px] leading-none font-extrabold",
                    selected ? "text-orange-600" : "text-stone-500",
                  ].join(" ")}
                >
                  {option.label}
                </span>
              )}
              {variant !== "text" && selected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-orange-500 text-white shadow-[0_2px_4px_rgb(154_52_18/0.35)] ring-2 ring-white"
                >
                  <CheckIcon className="size-3" strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The inside of a colour swatch chip. */
export function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="block size-full rounded-full shadow-[inset_0_-3px_5px_rgb(0_0_0/0.15),inset_0_2px_2px_rgb(255_255_255/0.45)]"
      style={{ backgroundColor: color }}
    />
  );
}
