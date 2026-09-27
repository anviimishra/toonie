"use client";
import { useEffect, useState } from "react";
import type { ComicPanelResult } from "@/types";
import { renderSticker } from "@/features/stories/export-sticker";

/** Colour by default, with an optional monochrome raster matching the print export. */
export function StickerComic({
  panels,
  title,
  small = false,
  monochrome = false,
}: {
  panels: ComicPanelResult[];
  title: string;
  small?: boolean;
  monochrome?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(null);
    setFailed(false);
    renderSticker(panels, monochrome)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [panels, monochrome]);
  return (
    <div className={`aspect-square w-full bg-white ${small ? "max-w-48" : ""}`}>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${title}, ${monochrome ? "black-and-white print" : "colour"} square sticker. ${panels.map((p, i) => `Panel ${i + 1}: ${p.scene}`).join(" ")}`}
            className="block size-full"
          />
        </>
      ) : (
        <p
          role={failed ? "alert" : "status"}
          className="grid h-full place-items-center p-4 text-sm"
        >
          {failed
            ? "Couldn't prepare the sticker preview. Reload to try again."
            : "Preparing sticker preview…"}
        </p>
      )}
    </div>
  );
}
