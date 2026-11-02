// Cookie-free page counts. Stores no IP address or visitor identifier, only the path and referring site.
import { insert, pageViewRow } from "./lib/store.mjs";

const MAX_BODY = 2000;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  if ((event.body?.length ?? 0) > MAX_BODY) return { statusCode: 413, body: "" };
  const site = process.env.URL;
  const origin = event.headers?.origin;
  if (site && origin && ![site, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].includes(origin)) return { statusCode: 403, body: "" };
  let input;
  try {
    input = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "" };
  }
  const row = pageViewRow(input);
  if (!row) return { statusCode: 400, body: "" };
  try {
    await insert("page_views", row);
  } catch (error) {
    console.error(error.message);
  }
  return { statusCode: 204, body: "" }; // analytics must never affect a visitor's page
};
