import { chromium } from "playwright";
import { pathToFileURL } from "url";
import { resolve } from "path";

// Render the HTML at a wide viewport for preview
const htmlFile = pathToFileURL(resolve("./proposal/portfolio.html")).href;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

await page.goto(htmlFile, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);

// Capture full page
await page.screenshot({ path: "./proposal/portfolio-preview.png", fullPage: true });
console.log("Preview saved");

// Also capture a "cover" snapshot (first viewport only) 
await page.screenshot({ path: "./proposal/portfolio-cover.png", fullPage: false });
console.log("Cover saved");

await browser.close();
