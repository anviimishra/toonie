import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DELIVERY_STATUSES, STORY_SOURCES, STORY_STATUSES } from "./types";

/**
 * types.ts is hand-written, so it can drift from the migration. These tests
 * read the SQL and fail when the two disagree -- a missing status here would
 * otherwise only surface as a runtime error mid-demo.
 */

const migrationsDir = path.resolve(import.meta.dirname, "../../../supabase/migrations");

function readMigrations(): string {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  return files
    .sort()
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
    .join("\n");
}

const sql = readMigrations();

function sqlEnumValues(name: string): string[] {
  const match = new RegExp(`create type ${name} as enum\s*\(([^)]*)\)`, "i").exec(sql);
  if (!match) throw new Error(`no "create type ${name} as enum" in the migrations`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const TABLES = ["capsules", "members", "devices", "stories", "deliveries"] as const;

describe("migration", () => {
  it("has at least one migration file", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it.each([
    ["story_source", STORY_SOURCES],
    ["story_status", STORY_STATUSES],
    ["delivery_status", DELIVERY_STATUSES],
  ])("%s matches the TypeScript union", (name, expected) => {
    expect(sqlEnumValues(name)).toEqual([...expected]);
  });

  it.each(TABLES)("creates the %s table", (table) => {
    expect(sql).toMatch(new RegExp(String.raw`create table ${table}\s*\(`, "i"));
  });

  it.each(TABLES)("enables row level security on %s", (table) => {
    expect(sql).toMatch(new RegExp(`alter table ${table} enable row level security`, "i"));
  });

  it("keeps panel_count inside the 1-6 the UI offers", () => {
    expect(sql).toMatch(/panel_count[\s\S]*check \(panel_count between 1 and 6\)/i);
  });

  it("makes delivery idempotent with a unique story/device pair", () => {
    expect(sql).toMatch(/unique \(story_id, device_id\)/i);
  });

  it("pins search_path on the trigger function", () => {
    // An unqualified name in a function body resolves through the caller's
    // search_path unless it is pinned; Supabase's linter flags that.
    expect(sql).toMatch(/set search_path = ''/i);
  });

  it("publishes deliveries to realtime", () => {
    expect(sql).toMatch(/alter publication supabase_realtime add table deliveries/i);
  });

  it.each([
    ["audio", "false"],
    ["comics", "true"],
  ])("creates the %s bucket", (bucket) => {
    expect(sql).toMatch(new RegExp(`'${bucket}', '${bucket}'`, "i"));
  });

  it("keeps audio private and comics public", () => {
    expect(sql).toMatch(/\('audio', 'audio', false\)/i);
    expect(sql).toMatch(/\('comics', 'comics', true\)/i);
  });
});
