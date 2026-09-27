import { z } from "zod";

/** New stickers are limited to four panels; legacy feed comics may still have six. */
export const STICKER_PANEL_COUNT_MAX = 4;
export const stickerPanelCountSchema = z.coerce.number().int().min(1).max(STICKER_PANEL_COUNT_MAX);
export const STICKER_EXPORT_PX = 1200;

export type PanelRect = { x: number; y: number; width: number; height: number };

/** Shared geometry for preview and export: 3 = two top panels and a wide ending. */
export function stickerRects(count: number, size = STICKER_EXPORT_PX): PanelRect[] {
  stickerPanelCountSchema.parse(count);
  const margin = size * 0.025;
  const gap = size * 0.015;
  const full = size - 2 * margin;
  const half = (full - gap) / 2;
  if (count === 1) return [{ x: margin, y: margin, width: full, height: full }];
  if (count === 2)
    return [0, 1].map((row) => ({
      x: margin,
      y: margin + row * (half + gap),
      width: full,
      height: half,
    }));
  return Array.from({ length: count }, (_, index) => ({
    x: margin + (index % 2) * (half + gap),
    y: margin + Math.floor(index / 2) * (half + gap),
    width: count === 3 && index === 2 ? full : half,
    height: half,
  }));
}

export function stickerAspectRatio(count: number, index: number): string {
  return count === 2 || (count === 3 && index === 2) ? "2:1" : "1:1";
}
