"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FloatingShapes } from "@/components/FloatingShapes";
import { Robot } from "@/components/Robot";

/** How long the splash stays up before moving on by itself. */
const SPLASH_MS = 3200;

const NAME = "Toonie";

/** Splash screen: the robot pops in and says hi, then it's on to /start. Tapping skips the wait. */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/start");
    const timer = setTimeout(() => router.replace("/start"), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main
      onClick={() => router.replace("/start")}
      className="relative flex min-h-dvh cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 p-6 text-center select-none"
    >
      <FloatingShapes tone="light" />

      {/* A soft sun behind the robot so orange-on-orange still pops. */}
      <div className="pop-in relative flex items-center justify-center">
        <div className="sun-pulse absolute size-72 rounded-full bg-orange-100/90 shadow-[0_0_80px_30px_rgba(255,237,213,0.6)]" />
        <Robot className="relative w-56" />
      </div>

      <h1 aria-label={NAME} className="relative mt-2 flex text-7xl font-black text-white">
        {NAME.split("").map((letter, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="letter-bounce sticker-text inline-block"
            style={{ "--delay": `${0.4 + i * 0.1}s` } as React.CSSProperties}
          >
            {letter}
          </span>
        ))}
      </h1>

      <p
        className="rise-in relative text-xl font-extrabold text-orange-50"
        style={{ "--delay": "0.9s" } as React.CSSProperties}
      >
        Stories that turn into comics
      </p>

      <p
        className="rise-in relative mt-6 rounded-full bg-white/20 px-5 py-2 text-sm font-bold text-white backdrop-blur-sm"
        style={{ "--delay": "1.4s" } as React.CSSProperties}
      >
        <span className="tap-pulse inline-block">Tap anywhere to start</span>
      </p>
    </main>
  );
}
