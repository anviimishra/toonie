import type { ReactNode } from "react";
import {
  describeScene,
  type SceneMood,
  type SceneProp,
  type SceneSetting,
  type SceneSpec,
  type SceneTime,
} from "@/features/feed";

/**
 * Draws a little comic scene from a panel's scene text, with no image files.
 * A stand-in for the Grok images: same text in, same picture out, every time.
 *
 * Everything is drawn on a 200x150 canvas in thick "ink" so it reads as a
 * cartoon at thumbnail size, and the SVG slices to fill whatever box it's in.
 */

const W = 200;
const H = 150;
const INK = "#1c1917";

const SHIRTS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#eab308", "#14b8a6"];
const SKIN = ["#fde2c8", "#f5c8a0", "#e0a877", "#b57a48", "#80502c"];
const HAIR = ["#1c1917", "#78350f", "#b45309", "#f59e0b", "#7c2d12"];
const GREY_HAIR = "#e7e5e4";

type Sky = { top: string; bottom: string };
const SKIES: Record<SceneTime, Sky> = {
  day: { top: "#7dd3fc", bottom: "#e0f2fe" },
  sunset: { top: "#fb923c", bottom: "#fde68a" },
  night: { top: "#1e1b4b", bottom: "#4338ca" },
  rain: { top: "#94a3b8", bottom: "#e2e8f0" },
};

/** Where feet touch the ground. */
function groundLine(setting: SceneSetting): number {
  return setting === "lake" ? 140 : 136;
}

/** Mulberry32: a tiny seeded PRNG, so "random" details are the same every render. */
function seededRandom(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)];
}

/* ---------- Background ---------- */

function SkyLayer({ sky }: { sky: Sky }) {
  return (
    <g stroke="none">
      <rect width={W} height={H} fill={sky.top} />
      <rect y={45} width={W} height={30} fill={sky.bottom} opacity={0.45} />
      <rect y={70} width={W} height={H - 70} fill={sky.bottom} />
    </g>
  );
}

/** Circles drawn outlined, then again filled on top, so only the outer edge is inked. */
function Puff({ circles, fill }: { circles: [number, number, number][]; fill: string }) {
  return (
    <g>
      {circles.map(([cx, cy, r], i) => (
        <circle key={`o${i}`} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
      {circles.map(([cx, cy, r], i) => (
        <circle key={`f${i}`} cx={cx} cy={cy} r={r - 1.25} fill={fill} stroke="none" />
      ))}
    </g>
  );
}

function Cloud({ x, y, fill = "#ffffff" }: { x: number; y: number; fill?: string }) {
  return (
    <Puff
      fill={fill}
      circles={[
        [x - 11, y + 2, 8],
        [x, y - 3, 11],
        [x + 12, y + 2, 8],
      ]}
    />
  );
}

function Sun({ x, y }: { x: number; y: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    return (
      <line
        key={i}
        x1={x + Math.cos(angle) * 17}
        y1={y + Math.sin(angle) * 17}
        x2={x + Math.cos(angle) * 23}
        y2={y + Math.sin(angle) * 23}
        strokeWidth={2}
      />
    );
  });
  return (
    <g>
      {rays}
      <circle cx={x} cy={y} r={13} fill="#fde047" />
    </g>
  );
}

function Moon({ x, y, sky }: { x: number; y: number; sky: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill="#fef9c3" />
      <circle cx={x + 7} cy={y - 4} r={10.5} fill={sky} stroke="none" />
    </g>
  );
}

function Stars({ random }: { random: () => number }) {
  return (
    <g stroke="none" fill="#fef9c3">
      {Array.from({ length: 7 }, (_, i) => {
        const x = 8 + random() * 130;
        const y = 6 + random() * 50;
        const r = 1 + random() * 1.2;
        return <circle key={i} cx={x} cy={y} r={r} />;
      })}
    </g>
  );
}

function Hills({ time }: { time: SceneTime }) {
  const fill = time === "night" ? "#312e81" : time === "sunset" ? "#f59e0b" : "#bbf7d0";
  return (
    <g strokeWidth={2}>
      <ellipse cx={40} cy={108} rx={60} ry={22} fill={fill} />
      <ellipse cx={150} cy={110} rx={70} ry={18} fill={fill} />
    </g>
  );
}

function Tufts({ y, random }: { y: number; random: () => number }) {
  return (
    <g strokeWidth={1.5} fill="none">
      {Array.from({ length: 5 }, (_, i) => {
        const x = 10 + i * 40 + random() * 20;
        const ty = y + 6 + random() * 8;
        return <path key={i} d={`M${x} ${ty} l2 -5 l2 5 l2 -4`} />;
      })}
    </g>
  );
}

function Outside({ spec, sky, random }: { spec: SceneSpec; sky: Sky; random: () => number }) {
  const { time, setting } = spec;
  const celestial =
    time === "day" ? (
      <Sun x={166} y={30} />
    ) : time === "night" ? (
      <>
        <Stars random={random} />
        <Moon x={164} y={28} sky={sky.top} />
      </>
    ) : time === "sunset" ? (
      <circle cx={150} cy={100} r={24} fill="#fb7185" />
    ) : (
      <>
        <Cloud x={60} y={24} fill="#cbd5e1" />
        <Cloud x={140} y={30} fill="#cbd5e1" />
      </>
    );

  return (
    <>
      <SkyLayer sky={sky} />
      {celestial}
      {(time === "day" || time === "sunset") && (
        <Cloud x={36 + random() * 60} y={22 + random() * 16} />
      )}
      {setting === "beach" && (
        <>
          <rect y={96} width={W} height={20} fill="#38bdf8" />
          <path
            d="M8 104 q6 -4 12 0 M60 108 q6 -4 12 0 M120 103 q6 -4 12 0 M170 107 q6 -4 12 0"
            fill="none"
            strokeWidth={1.5}
            stroke="#e0f2fe"
          />
          <rect y={114} width={W} height={H - 114} fill="#fde68a" />
          <g stroke="none" fill="#f59e0b" opacity={0.5}>
            <circle cx={30} cy={140} r={1.2} />
            <circle cx={90} cy={130} r={1.2} />
            <circle cx={150} cy={142} r={1.2} />
            <circle cx={180} cy={124} r={1.2} />
          </g>
        </>
      )}
      {setting === "lake" && (
        <>
          <rect y={94} width={W} height={10} fill="#4ade80" />
          <rect y={102} width={W} height={24} fill="#38bdf8" />
          <path
            d="M20 110 h14 M70 116 h18 M130 109 h12 M160 118 h16"
            fill="none"
            strokeWidth={1.5}
            stroke="#e0f2fe"
          />
          <rect y={124} width={W} height={H - 124} fill="#86efac" />
          <Tufts y={124} random={random} />
        </>
      )}
      {setting === "snow" && (
        <>
          <Hills time={time} />
          <rect y={106} width={W} height={H - 106} fill="#f8fafc" />
          <ellipse cx={60} cy={130} rx={40} ry={5} fill="#dbeafe" stroke="none" />
          <g stroke="none" fill="#ffffff">
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={random() * W} cy={random() * 100} r={1.4} />
            ))}
          </g>
        </>
      )}
      {setting === "outdoors" && (
        <>
          <Hills time={time} />
          <rect y={106} width={W} height={H - 106} fill="#86efac" />
          <Tufts y={106} random={random} />
        </>
      )}
    </>
  );
}

function Inside({ spec, sky }: { spec: SceneSpec; sky: Sky }) {
  const night = spec.time === "night";
  return (
    <>
      <rect width={W} height={112} fill={night ? "#fdba74" : "#fed7aa"} stroke="none" />
      <g stroke="#fb923c" strokeWidth={1} opacity={0.35}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={8 + i * 17} y1={0} x2={8 + i * 17} y2={112} />
        ))}
      </g>
      {/* Window */}
      <rect x={18} y={20} width={46} height={44} rx={3} fill={sky.top} />
      <rect x={20} y={48} width={42} height={14} fill={sky.bottom} stroke="none" opacity={0.6} />
      {night ? (
        <Moon x={44} y={35} sky={sky.top} />
      ) : spec.time === "day" ? (
        <circle cx={50} cy={32} r={7} fill="#fde047" strokeWidth={2} />
      ) : null}
      {spec.time === "rain" && (
        <g stroke="#1e40af" strokeWidth={1.2} opacity={0.6}>
          <line x1={28} y1={26} x2={25} y2={33} />
          <line x1={44} y1={36} x2={41} y2={43} />
          <line x1={56} y1={24} x2={53} y2={31} />
          <line x1={32} y1={48} x2={29} y2={55} />
        </g>
      )}
      <path d="M41 20 v44 M18 42 h46" strokeWidth={2.5} fill="none" />
      <rect x={18} y={20} width={46} height={44} rx={3} fill="none" />
      {/* Picture on the wall */}
      <rect x={146} y={26} width={32} height={24} fill="#fef3c7" />
      <path d="M150 46 l8 -10 l6 6 l4 -4 l6 8 z" fill="#86efac" strokeWidth={1.5} />
      {/* Floor */}
      <rect y={112} width={W} height={H - 112} fill="#e7b58a" />
      <path
        d="M0 126 h200 M60 112 v14 M140 112 v14 M30 126 v24 M110 126 v24 M170 126 v24"
        fill="none"
        strokeWidth={1.2}
        opacity={0.4}
      />
      <rect y={108} width={W} height={5} fill="#fff7ed" />
    </>
  );
}

/* ---------- People ---------- */

type Person = { x: number; shirt: string; skin: string; hair: string };

function Character({ person, g, mood }: { person: Person; g: number; mood: SceneMood }) {
  const { x, shirt, skin, hair } = person;
  const hy = g - 46; // head centre
  const arms =
    mood === "surprised"
      ? `M${x - 10} ${g - 28} L${x - 19} ${g - 44} M${x + 10} ${g - 28} L${x + 19} ${g - 44}`
      : mood === "sad"
        ? `M${x - 10} ${g - 26} L${x - 15} ${g - 12} M${x + 10} ${g - 26} L${x + 15} ${g - 12}`
        : `M${x - 10} ${g - 26} L${x - 19} ${g - 34} M${x + 10} ${g - 26} L${x + 18} ${g - 18}`;

  return (
    <g>
      <path d={`M${x - 5} ${g - 12} V${g} M${x + 5} ${g - 12} V${g}`} strokeWidth={3} fill="none" />
      <path d={arms} strokeWidth={3} fill="none" />
      <ellipse cx={x} cy={g - 22} rx={12} ry={14} fill={shirt} />
      <circle cx={x} cy={hy} r={12} fill={skin} />
      <path
        d={`M${x - 12} ${hy - 1} A12 12 0 0 1 ${x + 12} ${hy - 1} Q${x + 4} ${hy - 7} ${x - 12} ${hy - 1} Z`}
        fill={hair}
        strokeWidth={2}
      />
      <g stroke="none" fill={INK}>
        <circle cx={x - 4} cy={hy + 1} r={mood === "surprised" ? 2.1 : 1.6} />
        <circle cx={x + 4} cy={hy + 1} r={mood === "surprised" ? 2.1 : 1.6} />
      </g>
      <g stroke="none" fill="#fb7185" opacity={0.55}>
        <circle cx={x - 7.5} cy={hy + 5} r={2.3} />
        <circle cx={x + 7.5} cy={hy + 5} r={2.3} />
      </g>
      {mood === "surprised" ? (
        <ellipse cx={x} cy={hy + 6.5} rx={2} ry={2.6} fill={INK} stroke="none" />
      ) : mood === "sad" ? (
        <path
          d={`M${x - 3.5} ${hy + 8} Q${x} ${hy + 4.5} ${x + 3.5} ${hy + 8}`}
          strokeWidth={1.8}
          fill="none"
        />
      ) : (
        <path
          d={`M${x - 4} ${hy + 5} Q${x} ${hy + 9.5} ${x + 4} ${hy + 5}`}
          strokeWidth={1.8}
          fill="none"
        />
      )}
    </g>
  );
}

const CHARACTER_X: Record<number, number[]> = { 1: [100], 2: [84, 118], 3: [72, 100, 128] };

/* ---------- Props ---------- */

function Flower({ x, g, color }: { x: number; g: number; color: string }) {
  const cy = g - 20;
  return (
    <g>
      <path d={`M${x} ${g} V${cy}`} strokeWidth={2} fill="none" stroke="#15803d" />
      <ellipse cx={x + 4} cy={g - 8} rx={4} ry={2} fill="#4ade80" strokeWidth={1.5} />
      <g strokeWidth={1.5}>
        {[0, 72, 144, 216, 288].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={x + Math.cos(rad) * 4.5}
              cy={cy + Math.sin(rad) * 4.5}
              r={3.5}
              fill={color}
            />
          );
        })}
        <circle cx={x} cy={cy} r={2.8} fill="#fde047" />
      </g>
    </g>
  );
}

function Prop({
  kind,
  x,
  g,
  onWater,
}: {
  kind: SceneProp;
  x: number;
  g: number;
  onWater: boolean;
}) {
  switch (kind) {
    case "pie":
      return (
        <g>
          <path
            d={`M${x - 15} ${g - 9} L${x + 15} ${g - 9} L${x + 11} ${g} L${x - 11} ${g} Z`}
            fill="#fcd34d"
          />
          <ellipse cx={x} cy={g - 10} rx={15} ry={5} fill="#d97706" />
          <g strokeWidth={1.2} fill="#dc2626">
            <circle cx={x - 6} cy={g - 11} r={2.2} />
            <circle cx={x + 1} cy={g - 12} r={2.2} />
            <circle cx={x + 7} cy={g - 10} r={2.2} />
          </g>
          <path
            d={`M${x - 6} ${g - 22} q2 -4 0 -7 M${x + 4} ${g - 22} q2 -4 0 -7`}
            strokeWidth={1.5}
            fill="none"
            opacity={0.5}
          />
        </g>
      );
    case "cake":
      return (
        <g>
          <rect x={x - 14} y={g - 20} width={28} height={20} rx={2} fill="#fbcfe8" />
          <path
            d={`M${x - 14} ${g - 16} q3.5 5 7 0 q3.5 5 7 0 q3.5 5 7 0 q3.5 5 7 0 V${g - 20} H${x - 14} Z`}
            fill="#ffffff"
            strokeWidth={1.5}
          />
          <rect x={x - 1.5} y={g - 30} width={3} height={10} fill="#60a5fa" strokeWidth={1.2} />
          <ellipse cx={x} cy={g - 33.5} rx={2.4} ry={3.6} fill="#facc15" strokeWidth={1.2} />
        </g>
      );
    case "icecream":
      return (
        <g>
          <path d={`M${x - 7} ${g - 20} L${x + 7} ${g - 20} L${x} ${g} Z`} fill="#fbbf24" />
          <Puff
            fill="#f9a8d4"
            circles={[
              [x, g - 24, 8],
              [x + 1, g - 33, 6.5],
            ]}
          />
          <circle cx={x + 1} cy={g - 40} r={2} fill="#dc2626" strokeWidth={1.2} />
        </g>
      );
    case "cat":
      return (
        <g>
          <path d={`M${x - 11} ${g - 8} q-10 -4 -8 -16`} strokeWidth={3} fill="none" />
          <ellipse cx={x} cy={g - 9} rx={12} ry={9} fill="#fb923c" />
          <path
            d={`M${x + 4} ${g - 24} l1 -9 l5 5 M${x + 12} ${g - 26} l4 -8 l2 8`}
            fill="#fb923c"
            strokeWidth={2}
          />
          <circle cx={x + 10} cy={g - 20} r={7.5} fill="#fb923c" />
          <g stroke="none" fill={INK}>
            <circle cx={x + 7.5} cy={g - 21} r={1.2} />
            <circle cx={x + 13} cy={g - 21} r={1.2} />
          </g>
        </g>
      );
    case "dog":
      return (
        <g>
          <path d={`M${x - 13} ${g - 12} l-6 -8`} strokeWidth={3} fill="none" />
          <path
            d={`M${x - 7} ${g - 4} V${g} M${x + 7} ${g - 4} V${g}`}
            strokeWidth={3}
            fill="none"
          />
          <ellipse cx={x} cy={g - 11} rx={14} ry={8.5} fill="#d6a36b" />
          <circle cx={x + 13} cy={g - 20} r={8} fill="#d6a36b" />
          <ellipse cx={x + 8} cy={g - 18} rx={3.2} ry={6} fill="#92400e" strokeWidth={1.5} />
          <circle cx={x + 21} cy={g - 19} r={2} fill={INK} stroke="none" />
          <circle cx={x + 15} cy={g - 22} r={1.3} fill={INK} stroke="none" />
        </g>
      );
    case "fish": {
      const y = onWater ? 104 : g - 12;
      return (
        <g>
          {onWater && (
            <path
              d={`M${x - 16} ${y + 8} q-4 -6 -2 -10 M${x + 16} ${y + 8} q4 -6 2 -10`}
              strokeWidth={1.5}
              fill="none"
              stroke="#e0f2fe"
            />
          )}
          <path d={`M${x - 12} ${y} l-8 -6 v12 Z`} fill="#fb923c" />
          <ellipse cx={x} cy={y} rx={13} ry={7} fill="#fb923c" />
          <circle cx={x + 7} cy={y - 1.5} r={1.4} fill={INK} stroke="none" />
          <path d={`M${x - 2} ${y - 5} q2 5 0 10`} strokeWidth={1.2} fill="none" />
        </g>
      );
    }
    case "boat": {
      const y = onWater ? 118 : g;
      return (
        <g>
          <path d={`M${x} ${y - 12} V${y - 38}`} strokeWidth={2} />
          <path
            d={`M${x + 1} ${y - 36} L${x + 18} ${y - 14} H${x + 1} Z`}
            fill="#ffffff"
            strokeWidth={2}
          />
          <path d={`M${x - 22} ${y - 12} H${x + 22} L${x + 14} ${y} H${x - 14} Z`} fill="#ef4444" />
        </g>
      );
    }
    case "ball":
      return (
        <g>
          <circle cx={x} cy={g - 10} r={10} fill="#fef08a" />
          <path d={`M${x} ${g - 20} q-7 10 0 20 q7 -10 0 -20`} fill="#ef4444" stroke="none" />
          <path d={`M${x - 10} ${g - 10} q10 -5 20 0 q-10 5 -20 0`} fill="#3b82f6" stroke="none" />
          <circle cx={x} cy={g - 10} r={10} fill="none" />
        </g>
      );
    case "balloon":
      return (
        <g>
          <path
            d={`M${x} ${g - 4} q-4 -14 0 -26 M${x} ${g - 4} q6 -12 10 -20`}
            strokeWidth={1.2}
            fill="none"
          />
          <ellipse cx={x + 10} cy={g - 34} rx={8} ry={10} fill="#60a5fa" />
          <ellipse cx={x} cy={g - 41} rx={9} ry={11} fill="#f43f5e" />
          <ellipse
            cx={x - 3}
            cy={g - 45}
            rx={2}
            ry={3}
            fill="#ffffff"
            stroke="none"
            opacity={0.7}
          />
        </g>
      );
    case "flower":
      return (
        <g>
          <Flower x={x - 8} g={g} color="#f472b6" />
          <Flower x={x + 8} g={g + 2} color="#a78bfa" />
        </g>
      );
    case "tree":
      return (
        <g>
          <rect x={x - 4} y={g - 26} width={8} height={26} fill="#92400e" />
          <Puff
            fill="#22c55e"
            circles={[
              [x - 10, g - 34, 11],
              [x + 10, g - 34, 11],
              [x, g - 46, 13],
            ]}
          />
          <g strokeWidth={1.2} fill="#ef4444">
            <circle cx={x - 8} cy={g - 38} r={2.5} />
            <circle cx={x + 6} cy={g - 48} r={2.5} />
            <circle cx={x + 11} cy={g - 32} r={2.5} />
          </g>
        </g>
      );
    case "rock":
      return (
        <g>
          <path
            d={`M${x - 15} ${g} Q${x - 17} ${g - 16} ${x - 1} ${g - 17} Q${x + 16} ${g - 17} ${x + 15} ${g} Z`}
            fill="#a8a29e"
          />
          <g stroke="none" fill={INK}>
            <circle cx={x - 4} cy={g - 9} r={1.3} />
            <circle cx={x + 4} cy={g - 9} r={1.3} />
          </g>
          <path d={`M${x - 3} ${g - 5} q3 2.5 6 0`} strokeWidth={1.3} fill="none" />
        </g>
      );
    case "bus":
      return (
        <g>
          <rect x={x - 24} y={g - 28} width={48} height={22} rx={5} fill="#facc15" />
          <g fill="#bae6fd" strokeWidth={1.5}>
            <rect x={x - 19} y={g - 24} width={10} height={8} rx={1.5} />
            <rect x={x - 5} y={g - 24} width={10} height={8} rx={1.5} />
            <rect x={x + 9} y={g - 24} width={10} height={8} rx={1.5} />
          </g>
          <circle cx={x - 13} cy={g - 5} r={5} fill="#44403c" />
          <circle cx={x + 13} cy={g - 5} r={5} fill="#44403c" />
        </g>
      );
    case "book":
      return (
        <g>
          <rect x={x - 12} y={g - 6} width={24} height={6} fill="#3b82f6" />
          <rect x={x - 10} y={g - 12} width={20} height={6} fill="#ef4444" />
          <path
            d={`M${x - 13} ${g - 13} Q${x - 6} ${g - 20} ${x} ${g - 15} Q${x + 6} ${g - 20} ${x + 13} ${g - 13} Z`}
            fill="#ffffff"
            strokeWidth={1.8}
          />
        </g>
      );
    case "snowman":
      return (
        <g>
          <Puff
            fill="#ffffff"
            circles={[
              [x, g - 11, 11],
              [x, g - 28, 8],
            ]}
          />
          <circle cx={x} cy={g - 42} r={7} fill="#ffffff" />
          <path d={`M${x} ${g - 41} l7 1.5 l-7 1.5 Z`} fill="#f97316" strokeWidth={1} />
          <rect x={x - 6} y={g - 57} width={12} height={9} fill={INK} />
          <rect x={x - 9} y={g - 49} width={18} height={2.5} fill={INK} />
          <g stroke="none" fill={INK}>
            <circle cx={x - 2.5} cy={g - 44} r={1.1} />
            <circle cx={x + 2.5} cy={g - 44} r={1.1} />
            <circle cx={x} cy={g - 30} r={1.2} />
            <circle cx={x} cy={g - 25} r={1.2} />
          </g>
        </g>
      );
  }
}

/* ---------- Scene ---------- */

function Effects({ spec, random }: { spec: SceneSpec; random: () => number }): ReactNode {
  const out: ReactNode[] = [];
  if (spec.time === "rain" && spec.setting !== "indoors") {
    out.push(
      <g key="rain" stroke="#1e40af" strokeWidth={1.5} opacity={0.45}>
        {Array.from({ length: 22 }, (_, i) => {
          const x = random() * (W + 10);
          const y = random() * H;
          return <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 8} />;
        })}
      </g>,
    );
  }
  if (spec.time === "night" && spec.setting !== "indoors") {
    out.push(<rect key="dusk" width={W} height={H} fill="#1e1b4b" opacity={0.18} stroke="none" />);
  }
  return out;
}

export function SceneArt({ scene, label }: { scene: string; label?: string }) {
  const spec = describeScene(scene);
  const random = seededRandom(spec.seed);
  const sky = SKIES[spec.time];
  const g = groundLine(spec.setting);

  const people: Person[] = CHARACTER_X[spec.characters].map((x, i) => ({
    x,
    shirt: pick(SHIRTS, random),
    skin: pick(SKIN, random),
    hair: i === 0 && spec.elder ? GREY_HAIR : pick(HAIR, random),
  }));

  // Props flank the people. With one prop, the seed picks the side.
  const slots = random() < 0.5 ? [36, 164] : [164, 36];
  const onWater = spec.setting === "lake";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="block size-full"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        {spec.setting === "indoors" ? (
          <Inside spec={spec} sky={sky} />
        ) : (
          <Outside spec={spec} sky={sky} random={random} />
        )}
        {spec.props.map((prop, i) => (
          <Prop key={prop} kind={prop} x={slots[i]} g={g} onWater={onWater} />
        ))}
        {people.map((person, i) => (
          <Character key={i} person={person} g={g} mood={spec.mood} />
        ))}
        {spec.mood === "surprised" && (
          <g>
            <path
              d={`M${people[0].x - 20} ${g - 70} l3 8 M${people[0].x} ${g - 76} v8 M${people[0].x + 20} ${g - 70} l-3 8`}
              strokeWidth={2.5}
              fill="none"
            />
          </g>
        )}
        <Effects spec={spec} random={random} />
      </g>
    </svg>
  );
}
