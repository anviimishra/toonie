"use client";

import { StoryAudio } from "@/components/StoryAudio";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ComicsIcon } from "@/components/icons";
import { StickerComic } from "@/components/feed/StickerComic";
import { downloadSticker } from "@/features/stories/export-sticker";
import { ComicPanel } from "@/components/feed/ComicPanel";
import { ChevronLeftIcon, ReplyIcon } from "@/components/feed/icons";
import { LinkButton } from "@/components/feed/LinkButton";
import { SenderAvatar } from "@/components/feed/SenderAvatar";
import { feed, formatRelativeTime, type FeedItem } from "@/features/feed";

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error" }
  | { kind: "ready"; item: FeedItem; now: number };

function BackLink() {
  return (
    <Link
      href="/feed"
      aria-label="Back to your comics"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-stone-700 shadow-chip transition-transform duration-150 hover:bg-stone-50 focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
    >
      <ChevronLeftIcon className="size-5" />
    </Link>
  );
}

/**
 * One comic, full size: panels stacked top to bottom like the printed strip.
 * Opening it marks it seen.
 */
export default function ComicPage() {
  const { id } = useParams<{ id: string }>();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    feed
      .get(id)
      .then((item) => {
        if (!active) return;
        if (!item) {
          setState({ kind: "missing" });
          return;
        }
        setState({ kind: "ready", item, now: Date.now() });
        if (item.status === "new") void feed.markSeen(item.id).catch(() => {});
      })
      .catch(() => {
        if (active) setState({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (state.kind === "missing" || state.kind === "error") {
    const missing = state.kind === "missing";
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
          <BackLink />
        </header>
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
          <span className="grid size-24 place-items-center rounded-[28px] bg-white text-orange-500 shadow-card ring-1 ring-orange-100">
            <ComicsIcon className="size-11" />
          </span>
          <div>
            <h1 className="text-2xl font-black">
              {missing ? "We can't find that comic" : "That comic didn't load"}
            </h1>
            <p className="mt-2 text-stone-500">
              {missing
                ? "It may have been removed, or the link is off by a letter."
                : "Check your connection and try again in a moment."}
            </p>
          </div>
          <LinkButton href="/feed">Back to your comics</LinkButton>
        </section>
      </div>
    );
  }

  const item = state.kind === "ready" ? state.item : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <BackLink />
        {item ? (
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm text-stone-600">
              <SenderAvatar sender={item.sender} className="size-6 text-[11px] ring-1" />
              <span className="truncate">
                {item.direction === "sent" ? "Sent by" : "From"}{" "}
                <span className="font-extrabold text-stone-900">{item.sender.name}</span>
                {state.kind === "ready" && (
                  <span className="text-stone-400">
                    {" "}
                    · {formatRelativeTime(item.createdAt, state.now)}
                  </span>
                )}
              </span>
            </p>
            <h1 className="mt-1 text-[1.7rem] leading-tight font-black">{item.title}</h1>
          </div>
        ) : (
          <div
            className="flex-1 animate-pulse space-y-2 pt-1 motion-reduce:animate-none"
            aria-hidden="true"
          >
            <div className="h-3 w-1/3 rounded-full bg-stone-200" />
            <div className="h-6 w-3/4 rounded-full bg-stone-200" />
          </div>
        )}
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {item ? (
          <article
            aria-label={`${item.title}, a comic from ${item.sender.name}`}
            className="mx-auto flex max-w-sm flex-col gap-4 rounded-[28px] bg-white p-3 shadow-card ring-1 ring-orange-100/70"
          >
            {item.format === "sticker" ? (
              <StickerComic panels={item.panels} title={item.title} />
            ) : (
              item.panels.map((panel, i) => (
                <ComicPanel
                  key={i}
                  number={item.panels.length > 1 ? i + 1 : undefined}
                  scene={panel.scene}
                  caption={panel.caption}
                  imageUrl={panel.imageUrl}
                />
              ))
            )}
            {item.format === "sticker" && (
              <button
                className="py-3 font-bold underline"
                onClick={() => {
                  setDownloadError(null);
                  void downloadSticker(item.panels, item.title, true).catch(() =>
                    setDownloadError("Couldn't download the sticker. Please try again."),
                  );
                }}
              >
                Download black-and-white print PNG
              </button>
            )}
            {downloadError && (
              <p role="alert" className="text-sm text-red-600">
                {downloadError}
              </p>
            )}
            {item.audio && <StoryAudio audio={item.audio} />}
            {item.transcript && (
              <details className="p-2 text-sm">
                <summary className="cursor-pointer font-bold">Your original story</summary>
                <p className="mt-2 whitespace-pre-wrap">{item.transcript}</p>
              </details>
            )}
            <p className="pb-1 text-center text-xs font-black tracking-[0.2em] text-stone-400 uppercase">
              The end
            </p>
          </article>
        ) : (
          <div
            role="status"
            aria-label="Loading the comic"
            className="mx-auto aspect-[4/3] max-w-sm animate-pulse rounded-[28px] bg-white/70 shadow-card motion-reduce:animate-none"
          />
        )}
      </div>

      {item && (
        <div className="px-3 pt-1 pb-3">
          <LinkButton href="/" className="w-full">
            <ReplyIcon className="size-5" />
            {item.direction === "sent" ? "Make another comic" : "Send one back"}
          </LinkButton>
        </div>
      )}
    </div>
  );
}
