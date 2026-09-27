import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * A link that looks like the primary Button, for when the action is navigation.
 * Same raised gradient face and press-down behaviour as src/components/Button.tsx.
 */
export function LinkButton({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-lg font-extrabold",
        "bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised",
        "transition-[transform,box-shadow,filter] duration-150 motion-reduce:transition-none",
        "hover:brightness-105 active:translate-y-0.5 active:shadow-raised-pressed",
        "focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
