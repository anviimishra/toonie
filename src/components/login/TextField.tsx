"use client";

import { useId, useState, type InputHTMLAttributes, type Ref } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
  /** Shown under the field once it should be (the form decides when). */
  error?: string | null;
  hint?: string;
  /** Adds a show/hide toggle and switches the input type. */
  revealable?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/**
 * A labelled input that looks pressed into the card, with a friendly error
 * underneath. The error is announced once, when it appears.
 */
export function TextField({ label, error, hint, revealable = false, type, ref, ...input }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block pl-1 text-sm font-extrabold text-stone-600">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={revealable ? (revealed ? "text" : "password") : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            "w-full rounded-2xl bg-orange-50/70 px-4 py-3 text-base font-bold text-stone-800",
            "shadow-[inset_0_2px_5px_rgb(83_25_123/0.14),0_1px_0_rgb(255_255_255)] ring-1 transition-shadow",
            "placeholder:font-bold placeholder:text-stone-400",
            "focus:bg-white focus:ring-4 focus:outline-none",
            error
              ? "ring-red-300 focus:ring-red-300/60"
              : "ring-orange-100 focus:ring-orange-300/50",
            "read-only:cursor-wait read-only:opacity-70",
            revealable ? "pr-14" : "",
          ].join(" ")}
          {...input}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            aria-controls={id}
            className="absolute inset-y-1 right-1 grid w-11 place-items-center rounded-xl text-stone-400 transition-colors hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
          >
            {revealed ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 pl-1 text-xs font-bold text-stone-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 pl-1 text-sm font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
