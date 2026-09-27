"use client";

import type { ComponentType, SVGProps } from "react";

type Option<T extends string> = {
  value: T;
  label: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A pill switch: a recessed track with a raised thumb that slides to the
 * chosen option. Works for any small set of options of equal width.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid rounded-full bg-orange-100/80 p-1 shadow-[inset_0_2px_4px_rgb(154_52_18/0.15)]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_2px_6px_rgb(120_53_15/0.18)] transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map(({ value: optionValue, label: optionLabel, Icon }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(optionValue)}
            className={[
              "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-extrabold transition-colors",
              "focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none",
              selected ? "text-orange-600" : "text-stone-500 hover:text-stone-700",
            ].join(" ")}
          >
            {Icon && <Icon className="size-4" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
