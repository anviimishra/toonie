/** Bigger than any phone selfie; anything larger is almost certainly not one. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export type PhotoCheck = { ok: true } | { ok: false; reason: string };

/** Whether a picked file is usable as a selfie, with a child-friendly reason. */
export function checkPhoto(file: { type: string; size: number }): PhotoCheck {
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "That isn't a photo. Choose a JPG, PNG or WebP photo." };
  }
  if (file.size === 0) return { ok: false, reason: "That photo is empty. Try another one." };
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "That photo is too big. Try another one." };
  }
  return { ok: true };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the photo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Shrink a photo to a small JPEG data URL (browser only). Phone photos are
 * megabytes; a thumbnail is plenty to show back and fits in localStorage.
 */
export async function photoToDataUrl(file: Blob, maxSide = 320): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2d canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    // Formats the browser can't decode into a bitmap (HEIC on some browsers):
    // keep the original bytes rather than lose the photo.
    return readAsDataUrl(file);
  }
}
