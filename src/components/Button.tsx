import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:brightness-110",
  secondary: "bg-white text-foreground border border-stone-300 hover:bg-stone-50",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-full px-6 py-3 text-lg font-bold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
