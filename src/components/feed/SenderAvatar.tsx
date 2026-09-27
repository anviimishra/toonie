import type { FeedSender } from "@/features/feed";

/**
 * The sender's colour bubble with their initial. Decorative: the name is always
 * written out next to it.
 */
export function SenderAvatar({
  sender,
  className = "",
}: {
  sender: FeedSender;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "grid shrink-0 place-items-center rounded-full font-black text-stone-900/80 ring-2 ring-white",
        "shadow-[0_4px_10px_-2px_rgb(83_25_123/0.35),inset_0_1px_0_rgb(255_255_255/0.6)]",
        className,
      ].join(" ")}
      style={{
        backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${sender.color} 55%, white), ${sender.color})`,
      }}
    >
      {sender.name.charAt(0).toUpperCase()}
    </span>
  );
}
