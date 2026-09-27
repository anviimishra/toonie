import type { ComicPanelResult } from "@/types";
import { PRINT_WIDTH_DOTS, ditherToMono } from "./print";
import { STICKER_EXPORT_PX, stickerRects } from "./sticker";
import { thermalDither } from "./thermal";

/** Draws the sticker (white background, panels, borders) at `size` × `size` px. */
async function drawSticker(
  panels: ComicPanelResult[],
  size = STICKER_EXPORT_PX,
): Promise<HTMLCanvasElement> {
  const rects = stickerRects(panels.length, size);
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
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the sticker.");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  images.forEach((image, index) => {
    const r = rects[index];
    const border = Math.max(1, size * 0.005);
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
  return canvas;
}

export async function renderSticker(panels: ComicPanelResult[], monochrome = false): Promise<Blob> {
  const canvas = await drawSticker(panels);
  const ctx = canvas.getContext("2d")!;
  // A true black/white raster, matching the preview and avoiding thermal gray mush.
  if (monochrome) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    thermalDither(pixels.data, canvas.width);
    ctx.putImageData(pixels, 0, 0);
  }
  return toPng(canvas);
}

/**
 * The sticker for the Bluetooth label printer: exactly PRINT_WIDTH_DOTS wide,
 * already 1-bit (dithered) on an opaque white background, so the printer
 * script can send it without resizing or re-dithering it.
 */
export async function renderPrintImage(panels: ComicPanelResult[]): Promise<Blob> {
  const canvas = await drawSticker(panels, PRINT_WIDTH_DOTS);
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ditherToMono(pixels.data, canvas.width, canvas.height);
  ctx.putImageData(pixels, 0, 0);
  return toPng(canvas);
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
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
