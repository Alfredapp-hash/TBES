// Server-side writes to Supabase. The service key stays in Netlify's environment and never reaches a browser.

const FORMS = new Set(["contact", "partner", "portal"]);

const text = (value, limit) => {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, limit) : null;
};

/** The database row for a verified Netlify Forms submission, or null if it can't be stored. */
export function inquiryRow(payload) {
  const data = payload?.data ?? {};
  const row = {
    netlify_submission_id: text(payload?.id, 100),
    form_name: text(payload?.form_name, 50),
    name: text(data.name, 200),
    company: text(data.company, 200),
    email: text(data.email, 320),
    phone: text(data.phone, 50),
    interest: text(data.interest, 200),
    message: text(data.message, 10000),
  };
  const complete = row.netlify_submission_id && row.name && row.email && row.message;
  return complete && FORMS.has(row.form_name) ? row : null;
}

/** A page-view row from untrusted browser input, or null. Keeps only an on-site path and a referrer's host. */
export function pageViewRow(input) {
  const path = typeof input?.path === "string" ? input.path.split(/[?#]/)[0] : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 300) return null;
  let referrer_host = null;
  try {
    if (typeof input?.referrer === "string" && input.referrer) {
      referrer_host = new URL(input.referrer).hostname.slice(0, 255) || null;
    }
  } catch {
    referrer_host = null;
  }
  return { path, referrer_host };
}

/** Insert one row. Repeat deliveries of the same unique key are ignored. Throws without logging content. */
export async function insert(table, row, { conflict, env = process.env, fetcher = fetch } = {}) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Supabase is not configured");
  const query = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : "";
  const response = await fetcher(`${base}/rest/v1/${table}${query}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: conflict ? "resolution=ignore-duplicates,return=minimal" : "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Supabase insert failed with status ${response.status}`);
}
