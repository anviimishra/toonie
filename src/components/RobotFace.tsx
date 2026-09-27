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
      // Thinking hard about your comic: big eyes gazing up at a thought bubble,
      // blushing, tongue poking out, sparkles twinkling.
      return (
        <g>
          <Sparkle x={22} y={20} size={5} delay={0} />
          <Sparkle x={34} y={72} size={3.5} delay={0.7} />
          <Sparkle x={140} y={70} size={4} delay={1.3} />

          {/* Thought bubbles pop up one by one toward a little cloud */}
          <circle className="face-bubble fill-orange-200" style={delay(0)} cx="122" cy="24" r="2" />
          <circle
            className="face-bubble fill-orange-200"
            style={delay(0.3)}
            cx="128"
            cy="17"
            r="3"
          />
          <g className="face-bubble" style={delay(0.6)}>
            <path
              className="fill-orange-100 stroke-orange-300"
              strokeWidth="1.2"
              d="M134 13 a5 5 0 0 1 4 -7 a6 6 0 0 1 10 -2 a5 5 0 0 1 8 4 a4.5 4.5 0 0 1 -1 9 h-17 a4.5 4.5 0 0 1 -4 -4 z"
            />
            <path
              className="face-twinkle fill-accent"
              d="M145.5 5 l1.3 2.8 3 .3 -2.3 2 .7 3 -2.7 -1.6 -2.7 1.6 .7 -3 -2.3 -2 3 -.3 z"
            />
          </g>

          {/* Big shiny eyes; pupils drift up toward the bubble as it thinks */}
          <g className="robot-blink">
            {[LEFT, RIGHT].map((cx) => (
              <g key={cx}>
                <circle fill="currentColor" cx={cx} cy={EYE_Y} r="11" />
                <g className="face-ponder">
                  <circle fill="#ffffff" cx={cx + 3.5} cy={EYE_Y - 4.5} r="3.8" />
                  <circle fill="#ffffff" cx={cx - 3} cy={EYE_Y + 3.5} r="1.6" />
                </g>
              </g>
            ))}
          </g>

          <Cheeks />

          {/* Tiny "hmm" mouth with the tongue poking out the side */}
          <path
            {...line}
            strokeWidth={3}
            d={`M73 ${MOUTH_Y} Q77 ${MOUTH_Y - 3} 81 ${MOUTH_Y} Q85 ${MOUTH_Y + 3} 88 ${MOUTH_Y}`}
          />
          <path className="fill-rose-400" d={`M84 ${MOUTH_Y + 1.5} q0 5 3.5 5 q3.5 0 3 -5 z`} />
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

/** A four-point twinkle. */
function Sparkle({ x, y, size, delay: d }: { x: number; y: number; size: number; delay: number }) {
  // Position on the wrapper: the twinkle animation overrides transform on the path.
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className="face-twinkle fill-amber-300"
        style={delay(d)}
        d={`M0 ${-size} Q0 0 ${size} 0 Q0 0 0 ${size} Q0 0 ${-size} 0 Q0 0 0 ${-size} Z`}
      />
    </g>
  );
}

const delay = (seconds: number) => ({ "--delay": `${seconds}s` }) as React.CSSProperties;
