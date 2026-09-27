import { StickerComic } from "./StickerComic";
import Link from "next/link";
import { formatRelativeTime, type FeedItem } from "@/features/feed";
import { ComicThumbnail } from "./ComicThumbnail";
import { SenderAvatar } from "./SenderAvatar";

/** One received comic in the feed. The whole card is the link. */
export function FeedCard({ item, now }: { item: FeedItem; now: number }) {
  const isNew = item.status === "new";
  const when = formatRelativeTime(item.createdAt, now);
  const panels = `${item.panels.length} panel${item.panels.length === 1 ? "" : "s"}`;

  return (
    <Link
      href={`/feed/${encodeURIComponent(item.id)}`}
      aria-label={`${item.direction === "sent" ? "Sent: " : isNew ? "New: " : ""}${item.title}, from ${item.sender.name}, ${when}, ${panels}`}
      className={[
        "block rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur",
        "transition-transform duration-150 active:translate-y-0.5 active:scale-[0.99] motion-reduce:transition-none",
        "focus-visible:ring-4 focus-visible:ring-orange-300/70 focus-visible:outline-none",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <SenderAvatar sender={item.sender} className="size-11 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-stone-600">
            {item.direction === "sent" ? (
              "You sent a comic"
            ) : (
              <>
                <span className="font-extrabold text-stone-900">{item.sender.name}</span> sent you a
                comic
              </>
            )}
          </p>
          <p className="text-xs font-bold text-stone-400">{when}</p>
        </div>
        {item.direction === "sent" && (
          <span className="text-xs font-black text-orange-700">SENT</span>
        )}
        {isNew && (
          <span className="relative shrink-0 rounded-full bg-linear-to-b from-orange-400 to-orange-600 px-2.5 py-1 text-[11px] font-black tracking-wider text-white shadow-raised">
            <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-orange-400 motion-reduce:hidden" />
            NEW
          </span>
        )}
      </div>

      <h2 className="mt-3 mb-3 text-xl leading-tight font-black text-stone-900">{item.title}</h2>

      {item.format === "sticker" ? (
        <StickerComic panels={item.panels} title={item.title} />
      ) : (
        <ComicThumbnail panels={item.panels} />
      )}
    </Link>
  );
}

/** Placeholder card while the feed loads. */
export function FeedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[28px] bg-white/70 p-4 shadow-card ring-1 ring-orange-100/70"
    >
      <div className="flex animate-pulse items-center gap-3 motion-reduce:animate-none">
        <span className="size-11 rounded-full bg-orange-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded-full bg-stone-200" />
          <div className="h-2.5 w-1/4 rounded-full bg-stone-100" />
        </div>
      </div>
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded-full bg-stone-200 motion-reduce:animate-none" />
      <div className="mt-3 h-40 animate-pulse rounded-2xl bg-orange-50 motion-reduce:animate-none" />
    </div>
  );
}
