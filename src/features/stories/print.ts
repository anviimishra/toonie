/**
 * Image prep for the Bluetooth thermal label printer (the bleak/PIL script).
 * Pure functions, so they can be tested without a browser.
 */

/** The print head is 384 dots wide; the printer script expects this width. */
export const PRINT_WIDTH_DOTS = 384;

/**
 * Turns RGBA pixels into pure black/white in place with Floyd–Steinberg
 * dithering, the same method PIL's convert("1") uses, so shading survives on
 * a thermal printer. Transparent pixels become white paper, and every pixel
 * ends fully opaque.
 */
export function ditherToMono(rgba: Uint8ClampedArray, width: number, height: number): void {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const alpha = rgba[i * 4 + 3] / 255;
    const luminance = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    gray[i] = luminance * alpha + 255 * (1 - alpha);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const value = gray[i] < 128 ? 0 : 255;
      const error = gray[i] - value;
      gray[i] = value;
      if (x + 1 < width) gray[i + 1] += (error * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) gray[i + width - 1] += (error * 3) / 16;
        gray[i + width] += (error * 5) / 16;
        if (x + 1 < width) gray[i + width + 1] += error / 16;
      }
    }
  }

  for (let i = 0; i < gray.length; i++) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = gray[i];
    rgba[i * 4 + 3] = 255;
  }
}
