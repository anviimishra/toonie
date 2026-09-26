import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  // Raised: gradient face, coloured shadow underneath, highlight on top edge.
  // Pressing sinks it a pixel and tightens the shadow, like a real button.
  primary: [
    "bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised",
    "hover:brightness-105 active:translate-y-0.5 active:shadow-raised-pressed",
    "disabled:opacity-45 disabled:shadow-none disabled:saturate-75",
  ].join(" "),
  secondary: [
    "bg-white text-foreground shadow-chip",
    "hover:bg-stone-50 active:translate-y-0.5 active:shadow-none",
  ].join(" "),
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-lg font-extrabold",
        "transition-[transform,box-shadow,filter] duration-150",
        "focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none",
        "disabled:cursor-not-allowed",
        styles[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
