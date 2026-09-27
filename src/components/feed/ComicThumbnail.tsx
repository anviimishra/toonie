import { groupIntoRows, type FeedPanel } from "@/features/feed";
import { ComicPanel } from "./ComicPanel";

/** Row heights keep every thumbnail roughly the same overall size, whatever the count. */
function rowHeight(rows: number): string {
  return rows === 1 ? "h-40" : "h-[5.5rem]";
}

/**
 * A little comic page: 1 to 6 panels laid out in rows (see panelRows).
 * Decorative; the card it sits in names the comic.
 */
export function ComicThumbnail({ panels }: { panels: FeedPanel[] }) {
  const rows = groupIntoRows(panels);

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-stone-200"
    >
      {rows.map((row, r) => (
        <div key={r} className={`flex gap-1.5 ${rowHeight(rows.length)}`}>
          {row.map((panel, i) => (
            <div key={i} className="min-w-0 flex-1">
              <ComicPanel scene={panel.scene} imageUrl={panel.imageUrl} compact />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
