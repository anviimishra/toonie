import { createHash, timingSafeEqual } from "node:crypto";
import { secretHash } from "./pairing";
import { ApiError } from "./server-auth";
import { deliverySchema, type DeliveryInput } from "@/features/messages/contract";
export function contentHash(input: DeliveryInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
export function signDelivery(input: DeliveryInput, userId: string) {
  const body = Buffer.from(
    JSON.stringify({ input, userId, expires: Date.now() + 15 * 60000 }),
  ).toString("base64url");
  return `${body}.${secretHash(`delivery:${body}`)}`;
}
export function readDelivery(ticket: string, userId: string): DeliveryInput {
  try {
    const [body, signature, ...rest] = ticket.split(".");
    const expected = secretHash(`delivery:${body}`);
    if (
      rest.length ||
      !signature ||
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new Error();
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (data.userId !== userId || !Number.isFinite(data.expires) || data.expires < Date.now())
      throw new Error();
    return deliverySchema.parse(data.input);
  } catch {
    throw new ApiError(400, "Upload session expired or invalid. Please send again.");
  }
}
