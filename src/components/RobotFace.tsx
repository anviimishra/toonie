/**
 * A full-screen robot face: just eyes and a mouth, drawn for a landscape
 * phone. The screen itself is the robot's display, so there's no head,
 * antenna, or background art. Animations live in globals.css (face-*).
 */
export type Mood = "sleeping" | "listening" | "mail" | "illustrating" | "sent";

const LABELS: Record<Mood, string> = {
  sleeping: "The robot is asleep",
  listening: "The robot is listening",
  mail: "The robot has a comic for you",
  illustrating: "The robot is drawing a comic",
  sent: "The robot sent your comic",
};

// 16:9 canvas; the face is centered and scales to fit any screen.
const LEFT = 52;
const RIGHT = 108;
const EYE_Y = 38;
const MOUTH_Y = 62;

export function RobotFace({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={LABELS[mood]}
      className={className}
    >
      <g
        className={mood === "sleeping" ? "face-breathe" : mood === "mail" ? "face-hop" : undefined}
      >
        <Expression mood={mood} />
      </g>
    </svg>
  );
}

function Expression({ mood }: { mood: Mood }) {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 4,
    strokeLinecap: "round" as const,
  };

  switch (mood) {
    case "sleeping":
      // Closed eyes, a tiny relaxed mouth
      return (
        <g>
          <path
            {...line}
            d={`M${LEFT - 11} ${EYE_Y} Q${LEFT} ${EYE_Y + 8} ${LEFT + 11} ${EYE_Y}`}
          />
          <path
            {...line}
            d={`M${RIGHT - 11} ${EYE_Y} Q${RIGHT} ${EYE_Y + 8} ${RIGHT + 11} ${EYE_Y}`}
          />
          <path {...line} strokeWidth={3} d={`M74 ${MOUTH_Y} Q80 ${MOUTH_Y + 3} 86 ${MOUTH_Y}`} />
        </g>
      );

    case "listening":
      // Big shiny eyes, a little "ooh"
      return (
        <g>
          <g className="robot-blink">
            <OpenEye cx={LEFT} />
            <OpenEye cx={RIGHT} />
          </g>
          <ellipse fill="currentColor" cx="80" cy={MOUTH_Y + 2} rx="5" ry="6.5" />
          <Cheeks />
        </g>
      );

    case "mail":
      // Star eyes and a big open grin
      return (
        <g>
          <Star cx={LEFT} />
          <Star cx={RIGHT} />
          <path
            fill="currentColor"
            d={`M64 ${MOUTH_Y - 4} Q80 ${MOUTH_Y - 4} 96 ${MOUTH_Y - 4} Q93 ${MOUTH_Y + 14} 80 ${MOUTH_Y + 14} Q67 ${MOUTH_Y + 14} 64 ${MOUTH_Y - 4} Z`}
          />
          <path
            className="fill-orange-400"
            d={`M71 ${MOUTH_Y + 7} Q80 ${MOUTH_Y + 3} 89 ${MOUTH_Y + 7} Q85 ${MOUTH_Y + 12} 80 ${MOUTH_Y + 12} Q75 ${MOUTH_Y + 12} 71 ${MOUTH_Y + 7} Z`}
          />
          <Cheeks />
        </g>
      );

    case "illustrating":
      // Pupils dart side to side; concentrating, tongue poking out
      return (
        <g>
          <circle cx={LEFT} cy={EYE_Y} r="11" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx={RIGHT} cy={EYE_Y} r="11" fill="none" stroke="currentColor" strokeWidth="3" />
          <g className="face-scan">
            <circle fill="currentColor" cx={LEFT} cy={EYE_Y} r="5" />
            <circle fill="currentColor" cx={RIGHT} cy={EYE_Y} r="5" />
          </g>
          <path {...line} strokeWidth={3.5} d={`M70 ${MOUTH_Y} Q80 ${MOUTH_Y - 3} 91 ${MOUTH_Y}`} />
          <ellipse className="fill-orange-400" cx="88" cy={MOUTH_Y + 3} rx="4" ry="3" />
        </g>
      );

    case "sent":
      // ^^ happy eyes, big smile
      return (
        <g>
          <path
            {...line}
            d={`M${LEFT - 11} ${EYE_Y + 4} Q${LEFT} ${EYE_Y - 8} ${LEFT + 11} ${EYE_Y + 4}`}
          />
          <path
            {...line}
            d={`M${RIGHT - 11} ${EYE_Y + 4} Q${RIGHT} ${EYE_Y - 8} ${RIGHT + 11} ${EYE_Y + 4}`}
          />
          <path {...line} d={`M66 ${MOUTH_Y - 3} Q80 ${MOUTH_Y + 12} 94 ${MOUTH_Y - 3}`} />
          <Cheeks />
        </g>
      );
  }
}

function OpenEye({ cx }: { cx: number }) {
  return (
    <g>
      <circle fill="currentColor" cx={cx} cy={EYE_Y} r="11" />
      <circle fill="#ffffff" cx={cx + 3.5} cy={EYE_Y - 4} r="3.5" />
      <circle fill="#ffffff" cx={cx - 3.5} cy={EYE_Y + 3.5} r="1.5" />
    </g>
  );
}

function Star({ cx }: { cx: number }) {
  // Position lives on the wrapper: the twinkle animation overrides transform on the path.
  return (
    <g transform={`translate(${cx} ${EYE_Y})`}>
      <path
        className="face-twinkle fill-accent"
        d="M0 -13 L3.8 -4 L13 -4 L5.6 2.1 L8.1 11.3 L0 5.7 L-8.1 11.3 L-5.6 2.1 L-13 -4 L-3.8 -4 Z"
      />
    </g>
  );
}

function Cheeks() {
  return (
    <g className="fill-accent" opacity="0.35">
      <circle cx={LEFT - 12} cy={MOUTH_Y - 2} r="6" />
      <circle cx={RIGHT + 12} cy={MOUTH_Y - 2} r="6" />
    </g>
  );
}
