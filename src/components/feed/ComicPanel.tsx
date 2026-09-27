import { SceneArt } from "./SceneArt";

type Props = {
  /** What happens in the panel. Drives the stand-in art and its accessible name. */
  scene: string;
  caption?: string;
  dialogue?: { speaker: string; text: string }[];
  /** A real drawn image. When present it replaces the stand-in art. */
  imageUrl?: string;
  /** 1-based, shown as a little number tab on full-size panels. */
  number?: number;
  /**
   * Thumbnail mode: fills its parent, thinner ink, no caption, and hidden from
   * screen readers (the link around it carries the name).
   */
  compact?: boolean;
  className?: string;
};

/** Printed-comic dot screen, laid over the art. */
const HALFTONE = {
  backgroundImage: "radial-gradient(rgb(28 25 23 / 0.28) 0.9px, transparent 1.4px)",
  backgroundSize: "5px 5px",
};

/**
 * One comic panel: thick ink border, halftone texture, and a caption box.
 * Draws its own scene until the real images arrive.
 */
export function ComicPanel({
  scene,
  caption,
  dialogue,
  imageUrl,
  number,
  compact = false,
  className = "",
}: Props) {
  const label = compact ? undefined : `Panel${number ? ` ${number}` : ""}: ${scene}`;

  return (
    <figure
      className={[
        "relative m-0 flex flex-col overflow-hidden border-stone-900 bg-white",
        compact ? "size-full rounded-[10px] border-2" : "rounded-2xl border-[3px]",
        className,
      ].join(" ")}
      aria-hidden={compact ? true : undefined}
    >
      <div
        className={["relative overflow-hidden", compact ? "min-h-0 flex-1" : "aspect-[4/3]"].join(
          " ",
        )}
      >
        {imageUrl ? (
          // Generated images come from arbitrary storage URLs, which next/image
          // would need configuring for. A plain img is fine for a single panel.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label ?? ""} className="block size-full object-contain" />
        ) : (
          <SceneArt scene={scene} label={label} />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply"
          style={HALFTONE}
        />
        {!compact && number !== undefined && (
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 grid size-8 place-items-center rounded-br-xl border-r-[3px] border-b-[3px] border-stone-900 bg-amber-300 text-sm font-black text-stone-900"
          >
            {number}
          </span>
        )}
      </div>

      {!compact && (caption || dialogue?.length) && (
        <figcaption className="border-t-[3px] border-stone-900 bg-amber-50 px-4 py-3 text-[1.05rem] leading-snug font-extrabold text-stone-900">
          {caption && <p>{caption}</p>}
          {dialogue?.map((quote, index) => (
            <p key={index} className="mt-2 rounded-lg border-2 border-stone-900 bg-white px-3 py-2">
              <strong>{quote.speaker}:</strong> &ldquo;{quote.text}&rdquo;
            </p>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
