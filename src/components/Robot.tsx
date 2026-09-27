type Props = { className?: string };

/**
 * Toonie's mascot: a smiling orange robot that floats, blinks, and waves.
 * Orange comes from the theme's accent color, the same one Button uses.
 * Size it with a width class (e.g. "w-72"). Animations live in globals.css
 * (robot-*) and switch off for reduced motion.
 */
export function Robot({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 200 220"
      role="img"
      aria-label="Toonie, a smiling orange robot"
      className={`robot-float h-auto ${className}`}
    >
      {/* Shadow */}
      <ellipse
        className="robot-shadow fill-foreground"
        cx="100"
        cy="212"
        rx="46"
        ry="6"
        opacity="0.12"
      />

      {/* Antenna */}
      <line
        className="stroke-accent"
        x1="100"
        y1="30"
        x2="100"
        y2="50"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle className="robot-glow fill-accent" cx="100" cy="24" r="10" />

      {/* Ears */}
      <rect className="fill-accent" x="28" y="82" width="14" height="30" rx="6" />
      <rect className="fill-accent" x="158" y="82" width="14" height="30" rx="6" />

      {/* Head */}
      <rect className="fill-accent" x="40" y="48" width="120" height="96" rx="30" />
      <rect className="fill-background" x="54" y="62" width="92" height="68" rx="20" />

      {/* Eyes */}
      <g className="robot-blink fill-foreground">
        <circle cx="80" cy="90" r="9" />
        <circle cx="120" cy="90" r="9" />
        <circle cx="83" cy="87" r="3" fill="#ffffff" />
        <circle cx="123" cy="87" r="3" fill="#ffffff" />
      </g>

      {/* Cheeks */}
      <circle className="fill-accent" cx="68" cy="108" r="6" opacity="0.35" />
      <circle className="fill-accent" cx="132" cy="108" r="6" opacity="0.35" />

      {/* Smile */}
      <path
        className="stroke-foreground"
        d="M84 108 Q100 124 116 108"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Left arm (resting) */}
      <path
        className="stroke-accent"
        d="M58 160 Q38 172 40 192"
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Right arm (waving), pivots at the shoulder */}
      <g className="robot-wave">
        <path
          className="stroke-accent"
          d="M142 160 Q164 148 166 128"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle className="fill-accent" cx="166" cy="124" r="9" />
      </g>

      {/* Body */}
      <rect className="fill-accent" x="58" y="146" width="84" height="58" rx="18" />

      {/* Printer slot with a little comic peeking out */}
      <rect className="fill-foreground" x="74" y="160" width="52" height="6" rx="3" opacity="0.7" />
      <rect x="80" y="166" width="40" height="16" rx="2" fill="#ffffff" />
      <line x1="100" y1="168" x2="100" y2="180" stroke="#e7e5e4" strokeWidth="1.5" />

      {/* Belly heart */}
      <path className="fill-background" d="M100 196 l-6 -6 a4 4 0 0 1 6 -5 a4 4 0 0 1 6 5 z" />
    </svg>
  );
}
