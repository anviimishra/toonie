import type { Comic, ComicEvent } from "@/types";

/** NDJSON can split anywhere, including inside UTF-8 characters and the last line. */
export async function readComicStream(
  response: Response,
  onEvent: (event: ComicEvent) => void,
): Promise<Comic> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      (typeof body?.error === "string" ? body.error : body?.error?.message) ??
        "Couldn't start your comic. Please try again.",
    );
  }
  if (!response.body) throw new Error("The comic connection did not open.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let comic: Comic | undefined;
  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ComicEvent;
    onEvent(event);
    if (event.type === "error") throw new Error(event.message);
    if (event.type === "done") comic = event.comic;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(consume);
      if (done) break;
    }
    consume(pending);
    if (!comic || comic.panels.some((panel) => !panel.imageUrl)) {
      throw new Error("The connection ended before your comic was complete. Please try again.");
    }
    return comic;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
