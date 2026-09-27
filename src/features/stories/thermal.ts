/** Ordered halftone with lifted midtones: preserve dark ink, retain detail in dark fills.
 * Four-pixel cells keep dots visible after reducing a 1200px master for thermal output.
 */
export function thermalDither(data: Uint8ClampedArray, width: number, cell = 4): void {
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const lum =
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * alpha + 255 * (1 - alpha);
    const tone = lum < 18 ? 0 : 255 * Math.pow(lum / 255, 0.6);
    const pixel = i / 4,
      x = Math.floor((pixel % width) / cell) % 4,
      y = Math.floor(Math.floor(pixel / width) / cell) % 4;
    const value = tone > ((bayer[y * 4 + x] + 0.5) * 255) / 16 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
}
