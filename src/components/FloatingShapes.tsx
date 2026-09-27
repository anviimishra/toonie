type Tone = "light" | "warm";
type Kind = "star" | "heart" | "circle" | "sparkle";

type Shape = {
  kind: Kind;
  /** Position as % of the container. */
  top: number;
  left: number;
  size: number;
  /** Seconds, so shapes drift out of sync. */
  duration: number;
  delay: number;
};

// Fixed positions (not random) so server and client render the same thing.
const SHAPES: Shape[] = [
  { kind: "star", top: 8, left: 10, size: 28, duration: 7, delay: 0 },
  { kind: "circle", top: 14, left: 82, size: 22, duration: 9, delay: 1 },
  { kind: "heart", top: 30, left: 88, size: 26, duration: 8, delay: 0.5 },
  { kind: "sparkle", top: 38, left: 6, size: 20, duration: 6, delay: 2 },
  { kind: "circle", top: 62, left: 12, size: 16, duration: 10, delay: 0.8 },
  { kind: "star", top: 70, left: 86, size: 22, duration: 7.5, delay: 1.6 },
  { kind: "heart", top: 84, left: 20, size: 20, duration: 8.5, delay: 2.4 },
  { kind: "sparkle", top: 88, left: 74, size: 24, duration: 6.5, delay: 0.3 },
  { kind: "circle", top: 4, left: 48, size: 12, duration: 11, delay: 1.2 },
];

const COLORS: Record<Tone, string[]> = {
  light: ["#ffffff", "#fff7ed", "#fde68a"],
  warm: ["#f97316", "#fdba74", "#facc15"],
};

/** Stars, hearts, and bubbles drifting in the background. Purely decorative. */
export function FloatingShapes({ tone }: { tone: Tone }) {
  const colors = COLORS[tone];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((shape, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={shape.size}
          height={shape.size}
          className="drift absolute opacity-80"
          style={
            {
              top: `${shape.top}%`,
              left: `${shape.left}%`,
              "--duration": `${shape.duration}s`,
              "--delay": `${shape.delay}s`,
            } as React.CSSProperties
          }
        >
          <ShapePath kind={shape.kind} color={colors[i % colors.length]} />
        </svg>
      ))}
    </div>
  );
}

function ShapePath({ kind, color }: { kind: Kind; color: string }) {
  switch (kind) {
    case "star":
      return (
        <path
          fill={color}
          d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"
        />
      );
    case "heart":
      return (
        <path
          fill={color}
          d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 18.8 5 21 8.3 21.5 11.8 19.5 16.4 12 21 12 21z"
        />
      );
    case "sparkle":
      return (
        <path
          fill={color}
          d="M12 1c.8 5.6 3.4 8.2 11 11-7.6 2.8-10.2 5.4-11 11-.8-5.6-3.4-8.2-11-11 7.6-2.8 10.2-5.4 11-11z"
        />
      );
    case "circle":
      return <circle cx="12" cy="12" r="10" fill={color} />;
  }
}
