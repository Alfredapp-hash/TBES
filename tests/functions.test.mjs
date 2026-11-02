import assert from "node:assert/strict";
import { test } from "node:test";
import { inquiryRow, insert, pageViewRow } from "../netlify/functions/lib/store.mjs";
import { summarizeTraffic } from "../src/admin/traffic.mjs";

const payload = { id: "abc", form_name: "contact", data: { name: " Pat ", email: "pat@example.com", message: "Hello", phone: "" } };
const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fixture-key" };

test("a verified submission maps to a row; only known fields are kept", () => {
  const row = inquiryRow({ ...payload, data: { ...payload.data, status: "closed", "bot-field": "x" } });
  assert.equal(row.name, "Pat");
  assert.equal(row.phone, null);
  assert.equal(row.netlify_submission_id, "abc");
  assert.ok(!("status" in row));
  assert.ok(!("bot-field" in row));
});

test("unknown forms and missing required fields are not stored", () => {
  assert.equal(inquiryRow({ ...payload, form_name: "other" }), null);
  assert.equal(inquiryRow({ ...payload, data: { name: "Pat" } }), null);
  assert.equal(inquiryRow(null), null);
});

test("over-long values are cut to the database limits", () => {
  assert.equal(inquiryRow({ ...payload, data: { ...payload.data, name: "x".repeat(999) } }).name.length, 200);
});

test("page views keep only an on-site path and the referrer's host", () => {
  assert.deepEqual(pageViewRow({ path: "/contact?email=a@b.com#top", referrer: "https://www.google.com/search?q=secret" }),
    { path: "/contact", referrer_host: "www.google.com" });
  assert.equal(pageViewRow({ path: "//evil.example.com/" }), null);
  assert.equal(pageViewRow({ path: "https://evil.example.com/" }), null);
  assert.equal(pageViewRow({ path: 5 }), null);
  assert.equal(pageViewRow({ path: "/" + "x".repeat(400) }), null);
  assert.deepEqual(pageViewRow({ path: "/", referrer: "not a url" }), { path: "/", referrer_host: null });
});

test("insert sends the key only in headers and ignores repeat deliveries", async () => {
  let seen;
  await insert("inquiries", { a: 1 }, { conflict: "netlify_submission_id", env, fetcher: async (url, options) => {
    seen = { url, options };
    return { ok: true };
  } });
  assert.equal(seen.url, "https://x.supabase.co/rest/v1/inquiries?on_conflict=netlify_submission_id");
  assert.match(seen.options.headers.Prefer, /ignore-duplicates/);
  assert.ok(!seen.url.includes("fixture-key"));
  assert.ok(!seen.options.body.includes("fixture-key"));
});

test("insert fails loudly when unconfigured or rejected, without echoing content", async () => {
  await assert.rejects(insert("inquiries", {}, { env: {} }), /not configured/);
  await assert.rejects(insert("inquiries", { message: "private" }, { env, fetcher: async () => ({ ok: false, status: 401 }) }),
    (error) => /status 401/.test(error.message) && !error.message.includes("private"));
});

test("the address from Netlify's Supabase connection works, and plain http is refused", async () => {
  let url;
  const key = { SUPABASE_SERVICE_ROLE_KEY: "fixture-key" };
  await insert("page_views", {}, { env: { ...key, SUPABASE_DATABASE_URL: "https://y.supabase.co" }, fetcher: async (u) => { url = u; return { ok: true }; } });
  assert.equal(url, "https://y.supabase.co/rest/v1/page_views");
  await assert.rejects(insert("page_views", {}, { env: { ...key, SUPABASE_DATABASE_URL: "http://y.supabase.co" } }), /https/);
});

test("traffic totals fill empty days and rank pages and referring sites", () => {
  const rows = [
    { day: "2026-11-01", path: "/", referrer_host: "www.google.com", views: "3" },
    { day: "2026-11-02", path: "/", referrer_host: null, views: 1 },
    { day: "2026-11-02", path: "/contact", referrer_host: null, views: 2 },
  ];
  const summary = summarizeTraffic(rows, 3, new Date("2026-11-02T12:00:00Z"));
  assert.equal(summary.total, 6);
  assert.deepEqual(summary.series.map((point) => point.views), [0, 3, 3]);
  assert.deepEqual(summary.topPaths[0], { label: "/", views: 4 });
  assert.deepEqual(summary.topReferrers, [{ label: "www.google.com", views: 3 }]);
});

test("the page-view function only takes same-site POSTs", async () => {
  const { handler } = await import("../netlify/functions/page-view.mjs");
  process.env.URL = "https://site.example";
  const post = (origin) => handler({ httpMethod: "POST", body: "not json", headers: { origin } });
  assert.equal((await handler({ httpMethod: "GET" })).statusCode, 405);
  assert.equal((await post("https://evil.example")).statusCode, 403);
  assert.equal((await post("https://site.example")).statusCode, 400);
  delete process.env.URL;
});
