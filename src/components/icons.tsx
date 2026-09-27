import type { SVGProps } from "react";

/**
 * Small inline icons, so we ship no icon library for a handful of glyphs.
 * All are 24x24, stroke-based, and take their colour from `currentColor`.
 */

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

export function MicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />
    </svg>
  );
}

/** A little comic strip: the Feed tab. */
export function ComicsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M12 4v16" />
      <path d="M3 12h9" />
    </svg>
  );
}

export function FaceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.6} />
    </svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8L12 3z" />
      <path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7L19 15z" />
    </svg>
  );
}
