// Runs the real migration and tests/rls-local.sql on an in-process Postgres, with stand-ins for Supabase's roles.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the public and non-staff can't reach data; staff read and change status only", async () => {
  const script = read("tests/rls-local.sql")
    .replace("\\i /migration.sql", () => read("supabase/migrations/0001_inquiries_and_analytics.sql"))
    .replace("\\echo RLS CHECKS PASSED", "");
  const db = new PGlite();
  const notices = [];
  await db.exec(script, { onNotice: (notice) => notices.push(notice.message) });
  await db.close();
  assert.equal(notices.filter((message) => message.startsWith("denied as expected")).length, 11);
  assert.equal(notices.filter((message) => message.startsWith("ok:")).length, 7);
});
