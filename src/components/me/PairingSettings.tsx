"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { childAvatars } from "@/features/avatar";
import { avatarReference } from "@/features/avatar/reference";
import { apiJson, jsonBody } from "@/lib/api-client";
import { getPairs } from "@/features/messages/client";
import type { ParentChildPair } from "@/lib/supabase/types";
export function PairingSettings() {
  // One child per parent: a new code moves the connection to the new device.
  const [pair, setPair] = useState<ParentChildPair | null>(null),
    [name, setName] = useState("Child"),
    [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null),
    [problem, setProblem] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      getPairs()
        .then((p) => {
          if (active) setPair(p[0] ?? null);
        })
        .catch((e) => {
          if (active) setProblem(e.message);
        });
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function reference() {
    const avatar = await childAvatars.get();
    if (!avatar) throw new Error("Create and save your child's avatar first.");
    return avatarReference(avatar);
  }
  async function createCode() {
    setBusy(true);
    setProblem("");
    setNotice("");
    try {
      setCode(await apiJson("/api/pairing/code", jsonBody({ name, reference: await reference() })));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't create code.");
    } finally {
      setBusy(false);
    }
  }
  async function syncAvatar(id: string) {
    setBusy(true);
    setProblem("");
    try {
      await apiJson("/api/pairs", {
        ...jsonBody({ id, reference: await reference() }),
        method: "PATCH",
      });
      setNotice("Child avatar updated on the connected device.");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't update avatar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl bg-white p-5" aria-label="Connect child device">
      <h2 className="text-xl font-black">
        {pair ? "Your child's device" : "Connect a child device"}
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        {pair
          ? "Lost the connection or switching tablets? Make a new code and enter it on the child's device. Your comics stay, and the old device is disconnected."
          : "Save the child's avatar above, then make a code. On the other device, choose “I'm the kid” and enter it."}
      </p>
      <label className="mt-4 block text-sm font-bold">
        Child&apos;s name
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 p-3"
        />
      </label>
      <Button onClick={createCode} disabled={busy || !name.trim()} className="mt-3 w-full">
        {busy ? "Working…" : pair ? "Get a code to reconnect" : "Generate five-digit code"}
      </Button>
      {code && (
        <div className="mt-4 text-center" role="status">
          <p className="font-mono text-4xl tracking-[0.3em]">{code.code}</p>
          <p className="mt-2 text-sm">
            One use · expires at{" "}
            {new Date(code.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
      {pair && (
        <div className="mt-5 border-t border-stone-200 pt-3">
          <p className="font-bold">{pair.child_name} · Connected</p>
          <button
            disabled={busy}
            onClick={() => syncAvatar(pair.id)}
            className="mt-1 text-sm underline"
          >
            Sync current child avatar
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {problem}
        </p>
      )}
    </section>
  );
}
