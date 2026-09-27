import { z } from "zod";

// Inline raster data only: never ask the provider to fetch arbitrary user URLs.
export const referenceSchema = z
  .string()
  .max(8_000_000)
  .regex(
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    "Save a valid avatar image before making your comic.",
  );
