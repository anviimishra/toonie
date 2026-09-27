import type { ComicPanelResult } from "@/types";
import { STICKER_EXPORT_PX, stickerRects } from "./sticker";

export async function renderSticker(panels: ComicPanelResult[], monochrome = false): Promise<Blob> {
  const rects = stickerRects(panels.length);
  const images = await Promise.all(
    panels.map(async (panel) => {
      if (!panel.imageUrl) throw new Error("Every panel must finish before downloading.");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = panel.imageUrl;
      await image.decode();
      return image;
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = STICKER_EXPORT_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the sticker.");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  images.forEach((image, index) => {
    const r = rects[index];
    const border = STICKER_EXPORT_PX * 0.005;
    const scale = Math.min(
      (r.width - border * 2) / image.naturalWidth,
      (r.height - border * 2) / image.naturalHeight,
    );
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, r.x + (r.width - w) / 2, r.y + (r.height - h) / 2, w, h);
    ctx.strokeStyle = "black";
    ctx.lineWidth = border;
    ctx.strokeRect(r.x + border / 2, r.y + border / 2, r.width - border, r.height - border);
  });
  // A true black/white raster, matching the preview and avoiding thermal gray mush.
  if (monochrome) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const luminance =
        0.2126 * pixels.data[i] + 0.7152 * pixels.data[i + 1] + 0.0722 * pixels.data[i + 2];
      const value = luminance < 110 ? 0 : 255;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Couldn't export the sticker."))),
      "image/png",
    ),
  );
}

export async function downloadSticker(
  panels: ComicPanelResult[],
  title: string,
  monochrome = false,
): Promise<void> {
  const blob = await renderSticker(panels, monochrome);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}${monochrome ? "-print" : ""}-sticker.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
