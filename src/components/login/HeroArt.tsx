/**
 * The front-door picture: a little fan of comic panels with a speech bubble
 * popping out of the top one. Drawn inline so it costs no image request and
 * stays crisp at any size. Decorative, so hidden from screen readers.
 */

const INK = "#292524"; // stone-800, the comic outline

const MOTION = `
.toonie-bob { animation: toonie-bob 3.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 20% 90%; }
.toonie-twinkle { animation: toonie-twinkle 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.toonie-twinkle-late { animation-delay: -1.3s; }
@keyframes toonie-bob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-5px) rotate(3deg); } }
@keyframes toonie-twinkle { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.6); opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .toonie-bob, .toonie-twinkle { animation: none; } }
`;

function Sparkle({
  x,
  y,
  size,
  className,
}: {
  x: number;
  y: number;
  size: number;
  className: string;
}) {
  const s = size;
  return (
    <path
      className={className}
      d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
      fill="#fbbf24"
    />
  );
}

export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 180"
      aria-hidden="true"
      focusable="false"
      className={["drop-shadow-[0_14px_18px_rgb(83_25_123/0.22)]", className].join(" ")}
    >
      <style>{MOTION}</style>
      <defs>
        <linearGradient
          id="toonie-bubble"
          x1="0"
          y1="10"
          x2="0"
          y2="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#c26efc" />
          <stop offset="1" stopColor="#9623e7" />
        </linearGradient>
        <linearGradient id="toonie-buddy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d59bfd" />
          <stop offset="1" stopColor="#af41fb" />
        </linearGradient>
        <clipPath id="toonie-front">
          <rect x="80" y="34" width="100" height="128" rx="10" />
        </clipPath>
      </defs>

      {/* Soft contact shadow so the stack sits on something. */}
      <ellipse cx="130" cy="171" rx="72" ry="6" fill="rgb(83 25 123 / 0.12)" />

      {/* Back panels, fanned out behind. */}
      <g transform="rotate(-15 130 165)">
        <rect
          x="80"
          y="34"
          width="100"
          height="128"
          rx="10"
          fill="#fef3c7"
          stroke={INK}
          strokeWidth="4"
        />
        <path d="M80 98h100" stroke={INK} strokeWidth="3" />
      </g>
      <g transform="rotate(11 130 165)">
        <rect
          x="80"
          y="34"
          width="100"
          height="128"
          rx="10"
          fill="#ffe4e6"
          stroke={INK}
          strokeWidth="4"
        />
        <path d="M130 34v128" stroke={INK} strokeWidth="3" />
      </g>

      {/* Front panel: a sunny little scene with our round buddy. */}
      <g clipPath="url(#toonie-front)">
        <rect x="80" y="34" width="100" height="128" fill="#f2e0ff" />
        <circle cx="103" cy="60" r="11" fill="#fcd34d" />
        <g fill="#fff">
          <circle cx="134" cy="62" r="6" />
          <circle cx="143" cy="57" r="8" />
          <circle cx="152" cy="62" r="6" />
          <rect x="134" y="60" width="18" height="8" rx="4" />
        </g>
        <path d="M78 136Q130 108 182 136V164H78z" fill="#d6c2fe" />
        <circle cx="138" cy="116" r="17" fill="url(#toonie-buddy)" stroke={INK} strokeWidth="3" />
        <circle cx="132.5" cy="112" r="2.4" fill={INK} />
        <circle cx="143.5" cy="112" r="2.4" fill={INK} />
        <path
          d="M131.5 119q6.5 6 13 0"
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="127.5" cy="118" r="2.6" fill="#fb7185" opacity="0.55" />
        <circle cx="148.5" cy="118" r="2.6" fill="#fb7185" opacity="0.55" />
      </g>
      <rect
        x="80"
        y="34"
        width="100"
        height="128"
        rx="10"
        fill="none"
        stroke={INK}
        strokeWidth="4"
      />

      {/* Speech bubble, bobbing gently. Tail drawn between two ovals so the join has no seam. */}
      <g className="toonie-bob">
        <ellipse
          cx="206"
          cy="36"
          rx="40"
          ry="25"
          fill="url(#toonie-bubble)"
          stroke={INK}
          strokeWidth="3.5"
        />
        <path
          d="M184 52L162 74L197 59Z"
          fill="url(#toonie-bubble)"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <ellipse cx="206" cy="36" rx="38" ry="23" fill="url(#toonie-bubble)" />
        <text
          x="206"
          y="44"
          textAnchor="middle"
          fontSize="23"
          fontWeight="900"
          fill="#fff"
          style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}
        >
          Wow!
        </text>
      </g>

      <Sparkle x={42} y={62} size={9} className="toonie-twinkle" />
      <Sparkle x={58} y={34} size={5} className="toonie-twinkle toonie-twinkle-late" />
      <Sparkle x={236} y={96} size={7} className="toonie-twinkle toonie-twinkle-late" />
    </svg>
  );
}
