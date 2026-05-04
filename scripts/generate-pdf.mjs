import { chromium } from "playwright";
import { pathToFileURL } from "url";
import { resolve } from "path";

const htmlFile = pathToFileURL(resolve("./proposal/portfolio.html")).href;
const output = "./proposal/Eyad-Syam-Portfolio.pdf";

console.log(`Opening: ${htmlFile}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
const page = await ctx.newPage();

await page.goto(htmlFile, { waitUntil: "networkidle" });
// Wait for fonts to load
await page.waitForTimeout(3000);
await page.evaluate(() => document.fonts.ready);

// Generate PDF with proper settings
await page.pdf({
  path: output,
  format: "A4",
  printBackground: true,
  margin: {
    top: "12mm",
    bottom: "12mm",
    left: "10mm",
    right: "10mm",
  },
  preferCSSPageSize: false,
});

console.log(`PDF saved to: ${output}`);
await browser.close();
