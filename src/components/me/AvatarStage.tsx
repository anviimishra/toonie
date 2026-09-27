import type { ReactNode } from "react";

/**
 * Keyframes the Me screen uses beyond the shared theme ones. Kept here rather
 * than in globals.css so the screen owns its own motion. Everything stops for
 * people who ask for reduced motion.
 */
export function MeKeyframes() {
  return (
    <style>{`
@keyframes me-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes me-sweep {
  0%, 100% { transform: translateY(-110%); }
  50% { transform: translateY(110%); }
}
@keyframes me-twinkle {
  0%, 100% { transform: scale(0.5); opacity: 0.2; }
  50% { transform: scale(1); opacity: 1; }
}
@keyframes me-scribble {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-10px, 6px) rotate(-8deg); }
  50% { transform: translate(6px, 12px) rotate(4deg); }
  75% { transform: translate(10px, 2px) rotate(-4deg); }
}
.me-pop { animation: me-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.me-sweep { animation: me-sweep 1.8s ease-in-out infinite; }
.me-twinkle { animation: me-twinkle 1.4s ease-in-out infinite; }
.me-scribble { animation: me-scribble 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .me-pop, .me-sweep, .me-twinkle, .me-scribble { animation: none; }
}
`}</style>
  );
}

/**
 * The spotlight the avatar stands in: a breathing halo behind a white-rimmed
 * circle, like the record button's well. `children` fills the circle.
 */
export function AvatarStage({
  children,
  below,
  badge,
}: {
  children: ReactNode;
  /** A line under the stage. */
  below?: ReactNode;
  /** Something perched on the rim, positioned absolutely. */
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-52 place-items-center">
        <span
          aria-hidden="true"
          className="animate-breathe absolute inset-0 rounded-full bg-orange-300/40 motion-reduce:animate-none"
        />
        <div className="relative grid size-44 place-items-center rounded-full bg-white p-1.5 shadow-card ring-1 ring-orange-100">
          <div className="grid size-full place-items-center overflow-hidden rounded-full">
            {children}
          </div>
        </div>
        {badge}
      </div>
      {below}
    </div>
  );
}
