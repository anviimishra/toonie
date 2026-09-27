"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Robot } from "@/components/Robot";

/**
 * Second screen, after the splash: who is holding this device? Grown-ups send
 * stories from a phone, starting at login (/login); kids get the robot face (/face).
 */
type Role = "grown-up" | "kid";

const CHOICES: {
  role: Role;
  href: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}[] = [
  {
    role: "grown-up",
    href: "/login",
    title: "I'm the grown-up",
    detail: "Parent, grandparent, or caregiver. Tell stories from your phone.",
    icon: <GrownUpIcon />,
  },
  {
    role: "kid",
    href: "/face",
    title: "I'm the kid",
    detail: "Get comics on this screen, and send your own stories back.",
    icon: <KidIcon />,
  },
];

export default function Start() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const chosen = CHOICES.find((c) => c.role === role);

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-orange-50 to-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12 pb-8">
        <div className="rise-in flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-orange-100">
            <Robot className="w-14" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Who&apos;s using Toonie?</h1>
          <p className="text-muted mt-2">Choose how you&apos;ll use Toonie on this device.</p>
        </div>

        <div
          role="radiogroup"
          aria-label="Who's using Toonie?"
          className="rise-in mt-10 flex flex-col gap-3"
          style={{ "--delay": "0.1s" } as React.CSSProperties}
        >
          {CHOICES.map((choice) => {
            const selected = role === choice.role;
            return (
              <button
                key={choice.role}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(choice.role)}
                className={[
                  "flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition",
                  "focus-visible:ring-4 focus-visible:ring-orange-200 focus-visible:outline-none",
                  selected
                    ? "border-accent shadow-md shadow-orange-100"
                    : "border-stone-200 hover:border-orange-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-12 shrink-0 items-center justify-center rounded-xl transition",
                    selected ? "bg-accent text-white" : "bg-orange-100 text-orange-600",
                  ].join(" ")}
                >
                  {choice.icon}
                </span>
                <span className="flex-1">
                  <span className="block font-extrabold">{choice.title}</span>
                  <span className="text-muted block text-sm">{choice.detail}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={[
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                    selected ? "border-accent bg-accent" : "border-stone-300",
                  ].join(" ")}
                >
                  {selected && <span className="size-2 rounded-full bg-white" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-10">
          <Button
            className="w-full"
            disabled={!chosen}
            onClick={() => chosen && router.push(chosen.href)}
          >
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** A person holding a phone. */
function GrownUpIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="6" r="3" />
      <path d="M3 21v-2a5 5 0 0 1 5-5h2" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <path d="M17 18h1" />
    </svg>
  );
}

/** A smaller person with a star. */
function KidIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="9" r="3" />
      <path d="M5 20v-1a5 5 0 0 1 10 0v1" />
      <path d="M18.5 3l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" />
    </svg>
  );
}
