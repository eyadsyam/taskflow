import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3002";
const DIR = "D:/TaskFlow/screenshots";
mkdirSync(DIR, { recursive: true });

const log = (m) => console.log(`[TEST] ${m}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar-EG" });
  const page = await ctx.newPage();

  try {
    log("Login page");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/h-01-login.png`, fullPage: true });

    log("Register");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/h-02-register.png`, fullPage: true });

    log("Login with test account");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "eyadsyam124@gmail.com");
    await page.fill('input[type="password"]', "TaskFlow2024!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/onboarding|dashboard/, { timeout: 15000 }).catch(() => {});
    log(`Landed on: ${page.url()}`);
    
    if (page.url().includes("onboarding")) {
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${DIR}/h-03-onboarding.png`, fullPage: true });
      await page.click('button:has-text("كمل")').catch(() => {});
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${DIR}/h-04-onboarding2.png`, fullPage: true });
      await page.click('button:has-text("كمل")').catch(() => {});
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${DIR}/h-05-onboarding3.png`, fullPage: true });
      await page.click('button:has-text("يلا نبدأ")').catch(() => {});
      await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
    }
    
    log("Dashboard");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DIR}/h-06-dashboard.png`, fullPage: true });

    log("Chat");
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${DIR}/h-07-chat.png`, fullPage: true });

    log("Tasks");
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DIR}/h-08-tasks.png`, fullPage: true });

    log("Team");
    await page.goto(`${BASE_URL}/team`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DIR}/h-09-team.png`, fullPage: true });

    log("Done");
  } catch (e) {
    log(`Error: ${e.message}`);
    await page.screenshot({ path: `${DIR}/h-error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
})();
