import { Button } from "@/components/Button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-5xl font-extrabold">Toonie</h1>
      <p className="text-lg text-muted">
        Talk about your day. We turn it into a comic and print it on your family&apos;s robot.
      </p>
      <Button disabled>Record a story (coming soon)</Button>
    </main>
  );
}
