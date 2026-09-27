"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ComicsIcon, MicIcon } from "@/components/icons";
import { FeedCard, FeedCardSkeleton } from "@/components/feed/FeedCard";
import { LinkButton } from "@/components/feed/LinkButton";
import { watchMessages } from "@/features/messages/client";
import { feed, type FeedItem } from "@/features/feed";

type State =
  { kind: "loading" } | { kind: "error" } | { kind: "ready"; items: FeedItem[]; now: number };

/**
 * The feed: comics people have sent you, newest first. The list scrolls on its
 * own so the header and tab bar stay put.
 */
export default function FeedPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    feed
      .list()
      .then((items) => {
        if (active) setState({ kind: "ready", items, now: Date.now() });
      })
      .catch(() => {
        if (active) setState({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => watchMessages(() => setAttempt((n) => n + 1)), []);

  const retry = useCallback(() => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const newCount =
    state.kind === "ready" ? state.items.filter((item) => item.status === "new").length : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase">Toonie</p>
          <h1 className="text-[1.7rem] leading-tight font-black">Your comics</h1>
        </div>
        <span
          role="img"
          aria-label={
            newCount > 0 ? `${newCount} new comic${newCount === 1 ? "" : "s"}` : "No new comics"
          }
          className={[
            "grid size-11 place-items-center rounded-full ring-2 ring-white",
            newCount > 0
              ? "bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised"
              : "bg-linear-to-b from-amber-200 to-orange-300 text-orange-900 shadow-[0_4px_10px_-2px_rgb(103_29_154/0.35),inset_0_1px_0_rgb(255_255_255/0.6)]",
          ].join(" ")}
        >
          {newCount > 0 ? (
            <span className="text-lg font-black">{newCount}</span>
          ) : (
            <ComicsIcon className="size-6" />
          )}
        </span>
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-1 pb-4">
        {state.kind === "loading" && (
          <div className="flex flex-col gap-4" role="status" aria-label="Loading your comics">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-7 text-center">
            <p role="alert" className="font-bold text-stone-600">
              We couldn&apos;t load your comics. Check your connection and try again.
            </p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {state.kind === "ready" && state.items.length === 0 && <EmptyFeed />}

        {state.kind === "ready" && state.items.length > 0 && (
          <ul className="flex flex-col gap-4" aria-label="Your sent and received comics">
            {state.items.map((item) => (
              <li key={item.id}>
                <FeedCard item={item} now={state.now} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-5 px-7 py-8 text-center">
      <div className="relative grid size-32 place-items-center">
        <span className="animate-breathe absolute inset-0 rounded-full bg-orange-300/40 motion-reduce:animate-none" />
        <span className="relative grid size-24 place-items-center rounded-[28px] bg-white text-orange-500 shadow-card ring-1 ring-orange-100">
          <ComicsIcon className="size-11" />
        </span>
      </div>
      <div>
        <h2 className="text-2xl font-black">No comics yet</h2>
        <p className="mt-2 text-stone-500">
          When someone sends you a comic, it&apos;ll land here. Why not start the conversation?
        </p>
      </div>
      <LinkButton href="/">
        <MicIcon className="size-5" />
        Tell a story
      </LinkButton>
    </section>
  );
}
