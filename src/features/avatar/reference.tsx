import { renderToStaticMarkup } from "react-dom/server";
import { AvatarFace } from "@/components/me/AvatarFace";
import type { Avatar } from "./types";
import { backgroundColor, hairColor, skinTone } from "./options";

export function describeAvatar(avatar: Avatar): string {
  const c = avatar.config;
  return `The narrator has ${c.hair} ${hairColor(c.hairColor).label} hair, ${skinTone(c.skin).label} skin (${skinTone(c.skin).fill}), ${c.glasses ? "round glasses" : "no glasses"}, and a ${backgroundColor(c.background).shirt} shirt. Preserve the reference character's face and proportions.`;
}

/** Rasterize the very same SVG shown in the builder for the image API. */
export async function avatarReference(avatar: Avatar): Promise<string> {
  if (avatar.imageUrl) return avatar.imageUrl;
  const svg = renderToStaticMarkup(<AvatarFace config={avatar.config} size={512} />).replace(
    "<svg",
    '<svg xmlns="http://www.w3.org/2000/svg"',
  );
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare your avatar. Please try again.");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}
