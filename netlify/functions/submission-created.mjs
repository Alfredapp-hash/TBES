// Netlify runs a function with this exact name after each verified form submission, spam already filtered.
// Netlify Forms keeps its own copy, so a Supabase outage loses nothing. Logs never contain form content.
import { inquiryRow, insert } from "./lib/store.mjs";

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400, body: "Invalid event" };
  }
  const row = inquiryRow(payload);
  if (!row) {
    console.error("Form submission could not be stored: missing or unknown fields");
    return { statusCode: 200, body: "Skipped" };
  }
  try {
    await insert("inquiries", row, { conflict: "netlify_submission_id" });
  } catch (error) {
    console.error(error.message);
    return { statusCode: 502, body: "Not stored" };
  }
  return { statusCode: 200, body: "Stored" };
};
