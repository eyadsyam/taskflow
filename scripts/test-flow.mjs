import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "D:/TaskFlow/screenshots";
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const log = (msg) => console.log(`[TEST] ${msg}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-EG",
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => log(`PAGEERROR: ${err.message}`));

  try {
    // Login
    log("Login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "eyadsyam124@gmail.com");
    await page.fill('input[type="password"]', "TaskFlow2024!");
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/onboarding|dashboard/, { timeout: 15000 });
    log(`Got to: ${page.url()}`);

    // Onboarding
    if (page.url().includes("/onboarding")) {
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/onb-step1.png`, fullPage: true });

      log("Step 1 -> 2");
      await page.click('button:has-text("التالي")');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/onb-step2.png`, fullPage: true });

      log("Step 2 -> 3");
      await page.click('button:has-text("التالي")');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/onb-step3.png`, fullPage: true });

      log("Finishing...");
      await page.click('button:has-text("ابدأ")');
      await page.waitForURL(/dashboard/, { timeout: 15000 });
      log(`Onboarding complete: ${page.url()}`);
    }

    // Dashboard
    log("Dashboard...");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png`, fullPage: true });

    // Chat
    log("Chat...");
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    log(`Chat URL: ${page.url()}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/chat-empty.png`, fullPage: true });

    // Send message
    const textarea = page.locator('textarea[placeholder*="رسالة"]');
    if (await textarea.count() > 0) {
      log("Sending test message...");
      await textarea.fill("مرحبا بالفريق! هذه أول رسالة في نظام الدردشة الجديد 🎉");
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/chat-typing.png`, fullPage: true });
      
      await textarea.press("Enter");
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/chat-sent.png`, fullPage: true });
      
      // Send another
      await textarea.fill("والمحادثات اللحظية شغالة 💬");
      await textarea.press("Enter");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/chat-multi.png`, fullPage: true });
    } else {
      log("No textarea found in chat!");
    }

    // Tasks
    log("Tasks...");
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/tasks.png`, fullPage: true });

    // Team
    log("Team...");
    await page.goto(`${BASE_URL}/team`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/team.png`, fullPage: true });

    // New task
    log("New task...");
    await page.goto(`${BASE_URL}/tasks/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/new-task.png`, fullPage: true });

    log("Done!");
  } catch (e) {
    log(`FAILED: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
})();
