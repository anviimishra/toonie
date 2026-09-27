import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_COMIC_FILE, LOCAL_PRINT_FILE, isPng } from "@/lib/local-save";
import { apiError, requireUser, requireParent, ApiError } from "@/lib/server-auth";

/**
 * POST /api/local-save  (multipart: image=<PNG>, print=<PNG>)
 *
 * Writes the parent's latest generated comic to the root of the project folder,
 * overwriting the previous one, so tools on this computer can pick it up:
 *   toonie-comic.png  the full-color sticker
 *   toonie-print.png  the printer-ready version (384 px wide, 1-bit)
 *
 * Local development only: a deployed server has no project folder to write to.
 */
export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

const FILES = [
  { field: "image", name: LOCAL_COMIC_FILE },
  { field: "print", name: LOCAL_PRINT_FILE },
];

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Saving to disk only works locally." }, { status: 404 });
  }
  try {
    const { user } = await requireUser(request);
    requireParent(user);

    const form = await request.formData().catch(() => null);
    const written: string[] = [];
    for (const { field, name } of FILES) {
      const blob = form?.get(field);
      if (!(blob instanceof Blob)) continue;
      if (blob.size === 0) throw new ApiError(400, `The ${field} image is empty.`);
      if (blob.size > MAX_BYTES) throw new ApiError(413, `The ${field} image is too big.`);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!isPng(bytes)) throw new ApiError(400, "Only PNG images can be saved.");

      // Write then rename, so anything watching never reads a half-written file.
      const target = path.join(process.cwd(), name);
      await writeFile(`${target}.tmp`, bytes);
      await rename(`${target}.tmp`, target);
      written.push(name);
    }
    if (!written.length) throw new ApiError(400, "Send a PNG image.");

    console.info(`[local-save] wrote ${written.join(" and ")}`);
    return Response.json({ files: written });
  } catch (e) {
    return apiError(e);
  }
}
