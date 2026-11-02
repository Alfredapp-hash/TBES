import { createClient } from "@supabase/supabase-js";
import { summarizeTraffic } from "./traffic.mjs";

// The publishable key is public by design. RLS decides what it can reach, and that requires staff + MFA.
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const notice = el("notice");
const panels = ["sign-in", "mfa", "dashboard"];

function say(message: string, kind = "info") {
  notice.textContent = message;
  notice.dataset.kind = kind;
}

function show(panel: string | null) {
  for (const id of panels) el(id).hidden = id !== panel;
  el("sign-out").hidden = panel === "sign-in";
}

if (!url || !key) {
  say("This page isn't configured yet: the Supabase settings are missing from the build.", "error");
  throw new Error("PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing");
}

const supabase = createClient(url, key);
let factorId = "";

async function route() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    say("");
    show("sign-in");
    return;
  }
  const { data: level, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  if (level.currentLevel !== "aal2") {
    await startMfa();
    return;
  }
  const { data: staff, error: staffError } = await supabase.from("staff").select("user_id").eq("user_id", session.user.id);
  if (staffError) throw staffError;
  if (!staff.length) {
    show(null);
    say("This account doesn't have staff access.", "error");
    return;
  }
  say("");
  show("dashboard");
  await Promise.all([loadTraffic(), loadInquiries()]);
}

async function startMfa() {
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const verified = factors.totp[0];
  el("enroll").hidden = Boolean(verified);
  if (verified) {
    factorId = verified.id;
    el("mfa-title").textContent = "Enter your authenticator code";
  } else {
    // An abandoned setup leaves an unverified factor behind, which would block a new one.
    for (const factor of factors.all.filter((item) => item.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError) throw enrollError;
    factorId = data.id;
    el<HTMLImageElement>("qr").src = data.totp.qr_code;
    el("totp-key").textContent = data.totp.secret;
    el("mfa-title").textContent = "Set up your authenticator";
  }
  say("");
  show("mfa");
}

function listRow(label: string, views: number) {
  const item = document.createElement("li");
  const name = document.createElement("span");
  name.textContent = label;
  const count = document.createElement("span");
  count.textContent = views.toLocaleString();
  item.append(name, count);
  return item;
}

function fill(list: HTMLElement, items: { label: string; views: number }[]) {
  list.replaceChildren(...(items.length ? items.map((item) => listRow(item.label, item.views)) : [listRow("None yet", 0)]));
}

async function loadTraffic() {
  const days = Number(el<HTMLSelectElement>("days").value);
  const { data, error } = await supabase.rpc("traffic_summary", { days });
  if (error) throw error;
  const summary = summarizeTraffic(data, days);
  el("total").textContent = summary.total.toLocaleString();
  const peak = Math.max(1, ...summary.series.map((point) => point.views));
  const chart = el("chart");
  chart.setAttribute("aria-label", `Daily page views for the last ${days} days, ${summary.total} in total`);
  chart.replaceChildren(...summary.series.map((point) => {
    const bar = document.createElement("span");
    bar.style.height = `${(point.views / peak) * 100}%`;
    bar.title = `${point.day}: ${point.views}`;
    return bar;
  }));
  fill(el("top-paths"), summary.topPaths);
  fill(el("top-referrers"), summary.topReferrers);
}

function line(text: string, className = "") {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  paragraph.className = className;
  return paragraph;
}

// Inquiries are written by strangers: they only ever go into the page as text, never as HTML.
function inquiryCard(inquiry: Record<string, string>) {
  const card = document.createElement("article");
  card.className = "admin-inquiry";
  const who = [inquiry.name, inquiry.company].filter(Boolean).join(", ");
  const email = document.createElement("a");
  email.href = `mailto:${encodeURIComponent(inquiry.email)}`;
  email.textContent = inquiry.email;
  const contact = document.createElement("p");
  contact.append(email, inquiry.phone ? ` · ${inquiry.phone}` : "");
  const meta = `${new Date(inquiry.created_at).toLocaleString()} · ${inquiry.form_name}${inquiry.interest ? ` · ${inquiry.interest}` : ""}`;
  const status = document.createElement("select");
  status.setAttribute("aria-label", `Status for ${inquiry.name}`);
  for (const value of ["new", "contacted", "closed", "spam"]) {
    status.add(new Option(value[0].toUpperCase() + value.slice(1), value, false, value === inquiry.status));
  }
  status.addEventListener("change", async () => {
    const { error } = await supabase.from("inquiries").update({ status: status.value }).eq("id", inquiry.id);
    if (error) {
      status.value = inquiry.status;
      say(`The status didn't save: ${error.message}`, "error");
      return;
    }
    inquiry.status = status.value;
    say(`Marked ${inquiry.name} as ${status.value}.`);
  });
  card.append(line(who), contact, line(meta, "admin-meta"), line(inquiry.message, "message"), status);
  return card;
}

async function loadInquiries() {
  const filter = el<HTMLSelectElement>("status-filter").value;
  let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter) query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw error;
  el("inquiries-empty").hidden = data.length > 0;
  el("inquiries").replaceChildren(...data.map(inquiryCard));
}

/** Runs a step, keeping the failure on screen instead of leaving the page looking stuck. */
async function attempt(step: () => Promise<void>) {
  try {
    await step();
  } catch (error) {
    // Browsers report an unreachable server as a TypeError such as "Failed to fetch".
    if (error instanceof TypeError) say("Couldn't reach the sign-in service. Check your connection and try again.", "error");
    else say(error instanceof Error ? error.message : "Something went wrong. Please try again.", "error");
  }
}

function onSubmit(id: string, handler: (form: FormData, target: HTMLFormElement) => Promise<void>) {
  const form = el<HTMLFormElement>(id);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    if (button) button.disabled = true;
    await attempt(() => handler(new FormData(form), form));
    if (button) button.disabled = false;
  });
}

onSubmit("sign-in", async (form, target) => {
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) throw error;
  target.reset();
  await route();
});

onSubmit("mfa", async (form, target) => {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: String(form.get("code")) });
  if (error) throw error;
  target.reset();
  await route();
});

el("sign-out").addEventListener("click", () => attempt(async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await route();
}));
el("days").addEventListener("change", () => attempt(loadTraffic));
el("status-filter").addEventListener("change", () => attempt(loadInquiries));

attempt(route);
