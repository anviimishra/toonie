"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { auth, useCurrentUser, type AuthUser } from "@/features/auth";
import { HeroArt } from "./HeroArt";
import { ArrowRightIcon } from "./icons";
import { LoginForm } from "./LoginForm";
import { LoginShell } from "./LoginShell";

/**
 * The front door: a big friendly hello, then either the sign-in card or, if
 * you are already signed in, a one-tap way back in.
 */
export function LoginScreen() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  // Once a sign-in starts, keep the form on screen until we navigate away,
  // rather than flashing the "already signed in" card in between.
  const [submitting, setSubmitting] = useState(false);

  const goHome = () => router.replace("/");

  let card: React.ReactNode;
  if (loading) {
    card = <CardPlaceholder />;
  } else if (user && !submitting) {
    card = <SignedInCard user={user} onContinue={goHome} />;
  } else {
    card = <LoginForm onSubmitStart={() => setSubmitting(true)} onSuccess={goHome} />;
  }

  return (
    <LoginShell>
      <header className="flex flex-1 flex-col items-center justify-center pt-2 pb-5 text-center">
        <HeroArt className="h-40 w-auto [@media(max-height:700px)]:h-28" />
        <h1 className="mt-3 -rotate-2 bg-linear-to-b from-orange-400 to-orange-600 bg-clip-text pb-1 text-6xl leading-none font-black tracking-tight text-transparent drop-shadow-[0_3px_0_rgb(255_255_255)] [@media(max-height:700px)]:text-5xl">
          Toonie
        </h1>
        <p className="mt-2 text-lg font-extrabold text-stone-600 [@media(max-height:700px)]:mt-1 [@media(max-height:700px)]:text-base">
          Tell your day. Get a comic.
        </p>
      </header>

      {card}
    </LoginShell>
  );
}

function SignedInCard({ user, onContinue }: { user: AuthUser; onContinue: () => void }) {
  const [signingOut, setSigningOut] = useState(false);
  const initial = user.displayName.charAt(0).toUpperCase() || "?";

  async function switchAccount() {
    setSigningOut(true);
    try {
      await auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section
      aria-labelledby="signed-in-heading"
      className="rounded-[28px] bg-white/90 p-5 text-center shadow-card ring-1 ring-orange-100/70 backdrop-blur"
    >
      <span
        aria-hidden="true"
        className="mx-auto grid size-14 place-items-center rounded-full bg-linear-to-b from-amber-200 to-orange-300 text-2xl font-black text-orange-900 shadow-[0_4px_10px_-2px_rgb(103_29_154/0.35),inset_0_1px_0_rgb(255_255_255/0.6)] ring-2 ring-white"
      >
        {initial}
      </span>
      <h2 id="signed-in-heading" className="mt-3 text-xl font-black text-stone-800">
        You&apos;re signed in as {user.displayName}
      </h2>
      {user.email && <p className="mt-0.5 text-sm font-bold text-stone-400">{user.email}</p>}

      <Button onClick={onContinue} className="mt-5 w-full">
        Continue
        <ArrowRightIcon className="size-5" />
      </Button>
      <button
        type="button"
        onClick={switchAccount}
        disabled={signingOut}
        className="mt-3 rounded-full px-4 py-2 text-sm font-extrabold text-stone-500 transition-colors hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none disabled:opacity-50"
      >
        Not you? Use another account
      </button>
    </section>
  );
}

/** Holds the card's space while we check who you are, so nothing jumps. */
function CardPlaceholder() {
  return (
    <div
      aria-busy="true"
      aria-label="Checking whether you're signed in"
      className="h-72 rounded-[28px] bg-white/60 shadow-card ring-1 ring-orange-100/70"
    />
  );
}
