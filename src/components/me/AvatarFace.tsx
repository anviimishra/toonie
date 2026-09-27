import { useId } from "react";
import {
  type Avatar,
  type AvatarConfig,
  type HairStyle,
  backgroundColor,
  hairColor,
  skinTone,
} from "@/features/avatar";

/**
 * The avatar, drawn as layered SVG from a config: backdrop, back hair, body,
 * ears, head, front hair, face, glasses. Round shapes and a soft brown outline
 * keep it in the same friendly comic style at every size.
 *
 * Everything is drawn on a 200x200 canvas and clipped to a circle. The head
 * spans x 52-148 and y 50-150; eyes sit at y 106, so hair fringes stay above
 * y ~80 and never cover them.
 */

const OUTLINE = "#4a2c1d";
const STROKE = 3.5;

const SIZES = { xs: 32, sm: 44, md: 72, lg: 128, xl: 184 } as const;

/** A named size, a pixel size, or "fill" to take the width of its parent. */
export type AvatarSize = keyof typeof SIZES | number | "fill";

type Props = {
  config: AvatarConfig;
  size?: AvatarSize;
  /** Accessible name. Without one the drawing is treated as decoration. */
  label?: string;
  className?: string;
};

const line = {
  stroke: OUTLINE,
  strokeWidth: STROKE,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** A soft white highlight so hair reads as glossy rather than flat. */
function Shine({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="#fff"
      strokeOpacity={0.45}
      strokeWidth={4}
      strokeLinecap="round"
    />
  );
}

function HairBack({ style, fill, accent }: { style: HairStyle; fill: string; accent: string }) {
  switch (style) {
    case "long":
      return (
        <path
          d="M44 104 C 40 60, 70 36, 100 36 C 130 36, 160 60, 156 104 L 162 172 C 140 182, 60 182, 38 172 Z"
          fill={fill}
          {...line}
        />
      );
    case "bun":
      return (
        <g>
          <circle cx="100" cy="36" r="22" fill={fill} {...line} />
          <Shine d="M88 26 Q 94 20 102 20" />
        </g>
      );
    case "pigtails":
      return (
        <g>
          <circle cx="32" cy="94" r="19" fill={fill} {...line} />
          <circle cx="168" cy="94" r="19" fill={fill} {...line} />
          <circle cx="48" cy="84" r="6" fill={accent} {...line} strokeWidth={3} />
          <circle cx="152" cy="84" r="6" fill={accent} {...line} strokeWidth={3} />
        </g>
      );
    case "curly":
      return (
        <g>
          <circle cx="48" cy="112" r="13" fill={fill} {...line} />
          <circle cx="152" cy="112" r="13" fill={fill} {...line} />
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ style, fill }: { style: HairStyle; fill: string }) {
  switch (style) {
    case "short":
      return (
        <g>
          <path
            d="M50 108 C 44 66, 70 42, 102 42 C 134 42, 158 66, 150 108 C 146 94, 140 84, 132 78 C 116 86, 90 88, 70 80 C 60 88, 54 96, 50 108 Z"
            fill={fill}
            {...line}
          />
          <Shine d="M70 60 Q 82 50 98 49" />
        </g>
      );
    case "long":
      return (
        <g>
          <path
            d="M50 106 C 46 64, 72 42, 102 42 C 134 42, 156 66, 150 106 C 144 86, 128 70, 104 66 C 96 80, 74 92, 50 106 Z"
            fill={fill}
            {...line}
          />
          <Shine d="M110 52 Q 126 54 136 64" />
        </g>
      );
    case "curly": {
      const curls: [number, number, number][] = [
        [58, 94, 14],
        [62, 74, 16],
        [78, 58, 18],
        [100, 50, 20],
        [122, 58, 18],
        [138, 74, 16],
        [142, 94, 14],
      ];
      return (
        <g>
          <path
            d="M52 100 C 50 64, 74 46, 100 46 C 126 46, 150 64, 148 100 C 140 80, 120 72, 100 72 C 80 72, 60 80, 52 100 Z"
            fill={fill}
          />
          {curls.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} {...line} />
          ))}
          <Shine d="M70 52 Q 76 46 84 46" />
        </g>
      );
    }
    case "spiky":
      return (
        <path
          d="M50 106 C 46 86, 48 74, 54 66 L 48 50 L 66 54 L 70 36 L 86 46 L 100 28 L 114 46 L 130 36 L 134 54 L 152 50 L 146 66 C 152 74, 154 86, 150 106 C 144 90, 134 80, 122 76 L 112 84 L 100 74 L 88 84 L 78 76 C 66 80, 56 90, 50 106 Z"
          fill={fill}
          {...line}
        />
      );
    case "bun":
    case "pigtails":
      return (
        <g>
          <path
            d="M50 104 C 46 62, 74 44, 100 44 C 126 44, 154 62, 150 104 C 142 84, 124 70, 100 68 C 76 70, 58 84, 50 104 Z"
            fill={fill}
            {...line}
          />
          <path
            d="M100 46 L 100 66"
            stroke={OUTLINE}
            strokeOpacity={0.35}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Shine d="M68 64 Q 76 54 88 50" />
        </g>
      );
  }
}

export function AvatarFace({ config, size = "md", label, className }: Props) {
  // Ids must be unique per drawing, since the same page shows many avatars.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const skin = skinTone(config.skin);
  const hair = hairColor(config.hairColor);
  const bg = backgroundColor(config.background);
  const px = size === "fill" ? undefined : typeof size === "number" ? size : SIZES[size];
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      viewBox="0 0 200 200"
      width={px}
      height={px}
      className={[size === "fill" ? "block h-auto w-full" : "block shrink-0", className ?? ""].join(
        " ",
      )}
      {...a11y}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="100" cy="100" r="100" />
        </clipPath>
        <radialGradient id={`${id}-light`} cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="60%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        {/* Backdrop, lit from the top left. */}
        <rect width="200" height="200" fill={bg.fill} />
        <rect width="200" height="200" fill={`url(#${id}-light)`} />

        <HairBack style={config.hair} fill={hair.shade} accent={bg.shirt} />

        {/* Neck, shirt and collar. */}
        <rect x="87" y="132" width="26" height="34" rx="10" fill={skin.shade} {...line} />
        <path
          d="M28 214 C 30 172, 62 158, 100 158 C 138 158, 170 172, 172 214 Z"
          fill={bg.shirt}
          {...line}
        />
        <path d="M84 159 Q 100 176 116 159" fill={skin.shade} {...line} />

        {/* Ears, then the head over them. */}
        <circle cx="53" cy="106" r="10" fill={skin.fill} {...line} />
        <circle cx="147" cy="106" r="10" fill={skin.fill} {...line} />
        <circle cx="53" cy="106" r="4" fill={skin.shade} />
        <circle cx="147" cy="106" r="4" fill={skin.shade} />
        <ellipse cx="100" cy="100" rx="48" ry="50" fill={skin.fill} {...line} />

        <HairFront style={config.hair} fill={hair.fill} />

        {/* Face. */}
        <ellipse cx="70" cy="124" rx="8" ry="5" fill="#FF7A7A" opacity={0.4} />
        <ellipse cx="130" cy="124" rx="8" ry="5" fill="#FF7A7A" opacity={0.4} />
        <ellipse cx="82" cy="106" rx="5.5" ry="7" fill={OUTLINE} />
        <ellipse cx="118" cy="106" rx="5.5" ry="7" fill={OUTLINE} />
        <circle cx="84" cy="103" r="2" fill="#fff" />
        <circle cx="120" cy="103" r="2" fill="#fff" />
        <path
          d="M97 116 Q 100 119 103 116"
          fill="none"
          stroke={OUTLINE}
          strokeOpacity={0.5}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path d="M87 127 Q 100 143 113 127 Z" fill="#8A2F2A" {...line} strokeWidth={3} />
        <path d="M93 134 Q 100 131 107 134 Q 100 139 93 134 Z" fill="#FF8F8F" />

        {config.glasses && (
          <g>
            <circle
              cx="82"
              cy="106"
              r="14"
              fill="#fff"
              fillOpacity={0.22}
              {...line}
              strokeWidth={4}
            />
            <circle
              cx="118"
              cy="106"
              r="14"
              fill="#fff"
              fillOpacity={0.22}
              {...line}
              strokeWidth={4}
            />
            <path d="M96 105 Q 100 101 104 105" fill="none" {...line} strokeWidth={4} />
            <path d="M68 104 L 56 100 M132 104 L 144 100" fill="none" {...line} strokeWidth={4} />
          </g>
        )}
      </g>
    </svg>
  );
}

type PortraitProps = Omit<Props, "config"> & { avatar: Avatar };

/**
 * An avatar as the app should show it: the image model's drawing when there
 * is one, otherwise the SVG drawn from its config.
 */
export function AvatarPortrait({ avatar, size = "md", label, className }: PortraitProps) {
  if (!avatar.imageUrl) {
    return <AvatarFace config={avatar.config} size={size} label={label} className={className} />;
  }
  const px = size === "fill" ? undefined : typeof size === "number" ? size : SIZES[size];
  return (
    // A remote or data URL of unknown size: next/image would need config for
    // every host, and this is a small circle.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar.imageUrl}
      alt={label ?? ""}
      width={px}
      height={px}
      className={[
        "block aspect-square rounded-full object-cover",
        size === "fill" ? "h-auto w-full" : "shrink-0",
        className ?? "",
      ].join(" ")}
    />
  );
}
