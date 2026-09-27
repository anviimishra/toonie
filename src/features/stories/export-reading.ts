import type { ComicPanelResult } from "@/types";
/** Portrait reading copy with selectable captions also rendered by the preview UI. */
export async function renderReadingComic(panels: ComicPanelResult[]): Promise<Blob> {
  await document.fonts.ready;
  const images = await Promise.all(
    panels.map(async (panel) => {
      if (!panel.imageUrl) throw new Error("Finish every panel first.");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = panel.imageUrl;
      await image.decode();
      return image;
    }),
  );
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the reading comic.");
  canvas.width = 1200;
  ctx.font = "500 56px sans-serif";
  const rows = panels.map((panel, index) => {
    const lines: string[] = [];
    let line = "";
    const paragraphs = [
      panel.caption,
      ...(panel.dialogue ?? []).map((quote) => `${quote.speaker}: \u201c${quote.text}\u201d`),
    ];
    for (const paragraph of paragraphs) {
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > 1056 && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      line = "";
    }
    const image = images[index];
    const imageHeight = Math.round((1104 * image.naturalHeight) / image.naturalWidth);
    return { lines, imageHeight, height: imageHeight + lines.length * 76 + 96 };
  });
  canvas.height = 48 + rows.reduce((sum, row) => sum + row.height, 0);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "500 56px sans-serif";
  ctx.textBaseline = "top";
  let y = 48;
  rows.forEach((row, index) => {
    ctx.drawImage(images[index], 48, y, 1104, row.imageHeight);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, y, 1104, row.imageHeight);
    ctx.fillStyle = "#171717";
    row.lines.forEach((line, i) => ctx.fillText(line, 72, y + row.imageHeight + 24 + i * 76));
    y += row.height;
  });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't export comic."))),
      "image/png",
    ),
  );
}
