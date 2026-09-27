"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const COUNTS = [3, 4];

/**
 * How many panels the comic should have: raised chips, one tap each, all four
 * visible so the choice is obvious to a child. The chosen one sinks in.
 */
export function PanelCountPicker({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset disabled={disabled} className="w-full">
      <legend className="mb-2.5 flex w-full items-baseline justify-between text-sm font-extrabold text-stone-600">
        <span>Sticker panels</span>
        <span className="text-xs font-bold text-stone-400">
          {value} panel{value === 1 ? "" : "s"}
        </span>
      </legend>
      <div role="radiogroup" aria-label="Panel count" className="grid grid-cols-2 gap-2">
        {COUNTS.map((count) => {
          const selected = count === value;
          return (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${count} panel${count === 1 ? "" : "s"}`}
              onClick={() => onChange(count)}
              className={[
                "h-14 rounded-2xl text-lg font-black transition-all duration-150",
                "focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none",
                "disabled:opacity-40",
                selected
                  ? "translate-y-0.5 bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised-pressed"
                  : "bg-white text-stone-700 shadow-chip hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none",
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
