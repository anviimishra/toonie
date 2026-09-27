import { z } from "zod";
export const mediaSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  type: z.string().min(1).max(100),
});
export const deliverySchema = z
  .object({
    id: z.string().uuid(),
    pairId: z.string().uuid(),
    title: z.string().trim().min(1).max(80),
    transcript: z.string().trim().min(1).max(4000),
    originalTranscript: z.string().max(8000).nullable(),
    audioDurationMs: z.number().int().nonnegative().nullable(),
    panelCount: z.number().int().min(1).max(6),
    comic: mediaSchema.refine((m) => m.type === "image/png"),
    print: mediaSchema.refine((m) => m.type === "image/png").nullable(),
    thumbnail: mediaSchema.refine((m) => m.type === "image/png").optional(),
    audio: mediaSchema.refine((m) => m.type.startsWith("audio/")).nullable(),
  })
  .refine(
    (m) => !!m.audio || (m.originalTranscript === null && m.audioDurationMs === null),
    "Audio metadata requires a recording",
  );
export type DeliveryInput = z.infer<typeof deliverySchema>;
export function deliveryFiles(input: DeliveryInput) {
  const base = `${input.pairId}/${input.id}`;
  return [
    { key: "comic" as const, path: `${base}/comic.png`, media: input.comic },
    ...(input.print
      ? [{ key: "print" as const, path: `${base}/print.png`, media: input.print }]
      : []),
    ...(input.thumbnail
      ? [{ key: "thumbnail" as const, path: `${base}/thumbnail.png`, media: input.thumbnail }]
      : []),
    ...(input.audio ? [{ key: "audio" as const, path: `${base}/voice`, media: input.audio }] : []),
  ];
}
