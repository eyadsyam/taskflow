import { chromium } from "playwright";
import { pathToFileURL } from "url";
import { resolve } from "path";

const file = pathToFileURL(resolve("./proposal/portfolio.html")).href;
console.log("Rendering:", file);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(file, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "proposal/portfolio-preview.png", fullPage: true });
console.log("Saved portfolio-preview.png");
await browser.close();
