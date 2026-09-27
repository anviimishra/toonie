import Link from "next/link";
import { Robot } from "@/components/Robot";

/** Placeholder until the real receiver screen (wakes and prints when a comic arrives) is built. */
export default function Receiver() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <Robot className="w-56" />
      <h1 className="text-3xl font-extrabold">Waiting for a comic…</h1>
      <p className="text-muted">
        When a grown-up sends a story, it will pop up right here. This screen is coming soon!
      </p>
      <Link href="/" className="text-sm font-bold underline">
        Back
      </Link>
    </main>
  );
}
