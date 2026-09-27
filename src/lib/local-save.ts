/** The file the parent's latest comic is written to, in the project root. */
export const LOCAL_COMIC_FILE = "toonie-comic.png";

/**
 * The same comic formatted for the Bluetooth label printer script: 384 px
 * wide, 1-bit, white background. Print it with `python3 <script> toonie-print.png`.
 */
export const LOCAL_PRINT_FILE = "toonie-print.png";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** True if the bytes start with the PNG file signature. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);
}
