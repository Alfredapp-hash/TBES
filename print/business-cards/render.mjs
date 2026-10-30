import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/tmp/tb-verify/package.json");
const puppeteer = require("puppeteer-core");

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(dir, "cards.html");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
});
const page = await browser.newPage();
await page.goto(`file://${html}`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const names = [
  "tracy-springford-front",
  "tracy-springford-back",
  "brian-salsbury-front",
  "brian-salsbury-back",
  "craig-springfrod-front",
  "craig-springfrod-back",
];
const sheets = await page.$$(".sheet");
for (let index = 0; index < sheets.length; index += 1) {
  await sheets[index].screenshot({ path: path.join(dir, `${names[index]}.png`) });
}

await page.pdf({
  path: path.join(dir, "turbinebridge-business-cards.pdf"),
  preferCSSPageSize: true,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
