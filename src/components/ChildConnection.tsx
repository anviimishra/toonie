"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseChild } from "@/lib/supabase/client";
import { apiJson, jsonBody } from "@/lib/api-client";
import { getPairs } from "@/features/messages/client";
import { Button } from "@/components/Button";
import type { ParentChildPair } from "@/lib/supabase/types";
export function ChildConnection({
  children,
}: {
  children: (pair: ParentChildPair) => React.ReactNode;
}) {
  const [pair, setPair] = useState<ParentChildPair | null>(null),
    [loading, setLoading] = useState(true),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState("");
  useEffect(() => {
    let active = true;
    const client = supabaseChild();
    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) return;
        const pairs = await getPairs(true);
        if (active) setPair(pairs[0] ?? null);
      })
      .catch((e) => {
        if (active) setProblem(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function connect() {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      const client = supabaseChild();
      const { data } = await client.auth.getSession();
      if (!data.session) {
        const { error } = await client.auth.signInAnonymously();
        if (error)
          throw new Error(
            "Child sign-in isn't available. Enable Anonymous Sign-Ins in Supabase Auth, then try again.",
          );
      }
      await apiJson("/api/pairing/claim", jsonBody({ code }), true);
      const pairs = await getPairs(true);
      if (!pairs[0]) throw new Error("Pairing did not finish. Please try again.");
      setPair(pairs[0]);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p role="status" className="p-8">
        Opening your Toonie…
      </p>
    );
  if (pair) return children(pair);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-3xl font-black">Connect to your grown-up</h1>
      <p>Ask your grown-up to open Settings and generate a five-digit code.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
        className="space-y-4"
      >
        <label className="block font-bold">
          Connection code
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-xl border border-stone-300 p-4 text-center font-mono text-3xl tracking-widest"
          />
        </label>
        <Button type="submit" disabled={busy || code.length !== 5} className="w-full">
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </form>
      {problem && (
        <p role="alert" className="text-red-700">
          {problem}
        </p>
      )}
      <Link href="/start" className="text-center underline">
        Back to role selection
      </Link>
    </main>
  );
}
