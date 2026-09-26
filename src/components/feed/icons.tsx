import type { SVGProps } from "react";

/** Feed-only icons, drawn to match src/components/icons.tsx (24x24, stroke, currentColor). */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2.6}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** A curved arrow pointing back: "send one back". */
export function ReplyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
