// Uses temporary Auth users and removes only the records/files it creates.
// Run: node --env-file=.env.local scripts/smoke-delivery.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const parent = createClient(url, key, options);
const child = createClient(url, key, options);
const users = [],
  paths = [];
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
async function api(path, token, body, expected = 200) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
  return data;
}
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const audio = Buffer.alloc(46);
audio.write("RIFF");
audio.writeUInt32LE(38, 4);
audio.write("WAVEfmt ", 8);
audio.writeUInt32LE(16, 16);
audio.writeUInt16LE(1, 20);
audio.writeUInt16LE(1, 22);
audio.writeUInt32LE(8000, 24);
audio.writeUInt32LE(16000, 28);
audio.writeUInt16LE(2, 32);
audio.writeUInt16LE(16, 34);
audio.write("data", 36);
audio.writeUInt32LE(2, 40);
const media = (bytes, type) => ({
  size: bytes.length,
  type,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
try {
  const email = `toonie-smoke-${randomUUID()}@example.com`,
    password = randomUUID() + "!aA";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  users.push(created.data.user.id);
  const signed = await parent.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const anon = await child.auth.signInAnonymously();
  if (anon.error) throw anon.error;
  users.push(anon.data.user.id);
  const pt = signed.data.session.access_token,
    ct = anon.data.session.access_token;
  const code = await api("/api/pairing/code", pt, {
    name: "Smoke child",
    reference: `data:image/png;base64,${png.toString("base64")}`,
  });
  assert.match(code.code, /^\d{5}$/);
  const { pairId } = await api("/api/pairing/claim", ct, { code: code.code });
  assert.equal((await api("/api/pairs", ct)).pairs[0].id, pairId);
  for (const [sender, receiver, client, voice] of [
    [pt, ct, parent, true],
    [ct, pt, child, false],
  ]) {
    const input = {
      id: randomUUID(),
      pairId,
      title: "Delivery smoke test",
      transcript: "A tiny test adventure.",
      originalTranscript: voice ? "A tiny test adventure." : null,
      audioDurationMs: voice ? 1 : null,
      panelCount: 3,
      comic: media(png, "image/png"),
      print: media(png, "image/png"),
      thumbnail: media(png, "image/png"),
      audio: voice ? media(audio, "audio/wav") : null,
    };
    const prepared = await api("/api/messages/prepare", sender, input);
    await api("/api/messages/send", sender, { ticket: prepared.ticket }, 409);
    for (const upload of prepared.uploads) {
      paths.push(upload.path);
      const result = await client.storage
        .from("message-media")
        .uploadToSignedUrl(upload.path, upload.token, upload.key === "audio" ? audio : png, {
          contentType: upload.key === "audio" ? "audio/wav" : "image/png",
        });
      if (result.error) throw result.error;
    }
    // Retrying preparation after a completed upload must be supported.
    await api("/api/messages/prepare", sender, input);
    await api("/api/messages/send", sender, { ticket: prepared.ticket });
    assert.equal((await api("/api/messages/prepare", sender, input)).sent, true);
    const item = (await api(`/api/messages?id=${input.id}`, receiver)).items[0];
    assert.equal(item.direction, "received");
    assert.equal(item.transcript, input.transcript);
    assert.deepEqual(Buffer.from(await (await fetch(item.thumbnailUrl)).arrayBuffer()), png);
    assert.deepEqual(Buffer.from(await (await fetch(item.imageUrl)).arrayBuffer()), png);
    if (voice)
      assert.deepEqual(Buffer.from(await (await fetch(item.audioUrl)).arrayBuffer()), audio);
    assert.equal((await api("/api/messages/read", receiver, { id: input.id })).updated, true);
    assert.equal((await api(`/api/messages?id=${input.id}`, sender)).items[0].direction, "sent");
  }
  await api("/api/messages", "invalid", undefined, 401);
  console.log(
    "PASS: real email/password, anonymous pairing, both delivery directions, private PNG/audio retrieval, missing-upload rejection, retries, and read receipts.",
  );
} finally {
  if (paths.length) {
    const result = await admin.storage.from("message-media").remove(paths);
    if (result.error) console.error("Test media cleanup failed:", result.error.message);
  }
  for (const id of users) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) console.error("Test user cleanup failed:", result.error.message);
  }
}
