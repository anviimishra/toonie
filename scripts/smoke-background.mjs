// Live provider test. Uses a synthetic avatar and temporary account; consumes xAI credits.
// node --env-file=.env.local scripts/smoke-background.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const panelCount = Number(process.env.SMOKE_PANELS || 3);
let uid, jobId;
try {
  const email = `toonie-job-${randomUUID()}@example.com`,
    password = randomUUID() + "!aA";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  uid = created.data.user.id;
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const headers = { Authorization: `Bearer ${login.data.session.access_token}` };
  const reference = await sharp(
    Buffer.from(
      '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#fff"/><ellipse cx="128" cy="237" rx="72" ry="74" fill="#589ac0" stroke="#161616" stroke-width="5"/><ellipse cx="128" cy="112" rx="69" ry="79" fill="#482d20" stroke="#161616" stroke-width="5"/><path d="M61 98Q58 22 128 24Q201 20 197 100Q158 46 115 70Z" fill="#161616"/><ellipse cx="102" cy="113" rx="14" ry="17" fill="white"/><ellipse cx="151" cy="113" rx="14" ry="17" fill="white"/><circle cx="105" cy="115" r="7"/><circle cx="148" cy="115" r="7"/><path d="M103 150Q128 174 155 150" fill="none" stroke="white" stroke-width="6"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const form = new FormData();
  form.set(
    "text",
    "I found a tiny smooth rock at the park. I named it Kevin and brought it home to show my family.",
  );
  form.set("panelCount", String(panelCount));
  form.set("reference", `data:image/png;base64,${reference.toString("base64")}`);
  const started = Date.now();
  const response = await fetch(base + "/api/comics?background=1", {
    method: "POST",
    headers,
    body: form,
  });
  const result = await response.json();
  assert.equal(response.status, 202, JSON.stringify(result));
  jobId = result.id;
  console.log(
    `Accepted job in ${Math.round((Date.now() - started) / 1000)} seconds; original response closed.`,
  );
  // No stream is kept open. Every status request is a new connection.
  let ready;
  for (let i = 0; i < 65; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusResponse = await fetch(base + "/api/comic-jobs", { headers });
    assert.equal(statusResponse.status, 200);
    const { job } = await statusResponse.json();
    assert.equal(job.id, jobId);
    if (i % 3 === 0) console.log(`${job.status}: ${job.stage} (${job.drawn}/${job.panel_count})`);
    if (job.status === "failed") throw new Error(job.error);
    if (job.status === "ready") {
      ready = job;
      break;
    }
  }
  assert.ok(ready, "Job did not complete");
  assert.equal(ready.comic.readingVersion, 1);
  assert.equal(ready.comic.panels.length, panelCount);
  for (const panel of ready.comic.panels) {
    assert.ok(panel.caption.trim());
    assert.equal((await fetch(panel.imageUrl)).status, 200);
  }
  console.log("PASS: background result and captions restored.");
  assert.equal(
    (await fetch(base + `/api/comic-jobs?id=${jobId}`, { method: "DELETE", headers })).status,
    200,
  );
  assert.equal((await (await fetch(base + "/api/comic-jobs", { headers })).json()).job, null);
  console.log(
    "PASS: real Grok generation continued after response, restored captions and private artwork, and archived successfully.",
  );
} finally {
  if (uid && jobId) {
    const { data } = await admin.storage.from("comic-drafts").list(`${uid}/${jobId}`);
    if (data?.length)
      await admin.storage
        .from("comic-drafts")
        .remove(data.map((file) => `${uid}/${jobId}/${file.name}`));
  }
  if (uid) await admin.auth.admin.deleteUser(uid);
}
