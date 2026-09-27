"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { FaceIcon } from "@/components/icons";
import { auth, useCurrentUser } from "@/features/auth";
import type { Avatar } from "@/features/avatar";
import { AvatarPortrait } from "./AvatarFace";

/** Who is signed in, with a way out (or in). */
export function AccountCard({ avatar }: { avatar: Avatar | null }) {
  const { user, loading } = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section
      aria-label="Your account"
      className="mx-3 flex items-center gap-3 rounded-[28px] bg-white/90 p-3 pl-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur"
    >
      {avatar ? (
        <span className="rounded-full shadow-[0_4px_10px_-2px_rgb(154_52_18/0.35)] ring-2 ring-white">
          <AvatarPortrait avatar={avatar} size="sm" />
        </span>
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-b from-amber-200 to-orange-300 text-orange-900 ring-2 ring-white">
          <FaceIcon className="size-6" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {loading ? (
          <p className="text-sm font-bold text-stone-400">Checking…</p>
        ) : user ? (
          <>
            <p className="text-xs font-bold text-stone-400">Signed in as</p>
            <p className="truncate text-lg leading-tight font-black">{user.displayName}</p>
          </>
        ) : (
          <p className="text-lg leading-tight font-black text-stone-600">Not signed in</p>
        )}
      </div>

      {!loading &&
        (user ? (
          <Button
            variant="secondary"
            onClick={signOut}
            disabled={signingOut}
            className="px-4 py-2.5 text-base"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-linear-to-b from-orange-400 to-orange-600 px-5 py-2.5 text-base font-extrabold text-white shadow-raised transition-[transform,box-shadow] duration-150 hover:brightness-105 focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none active:translate-y-0.5 active:shadow-raised-pressed"
          >
            Sign in
          </Link>
        ))}
    </section>
  );
}
