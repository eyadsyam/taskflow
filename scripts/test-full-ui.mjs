import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = process.argv[2] || "http://localhost:3000";
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

  const errors = [];
  page.on("pageerror", (err) => errors.push(`Page error: ${err.message}`));

  try {
    // 1. Login
    log("1. Login page");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    log("Filling credentials...");
    await page.fill('input[type="email"]', "eyadsyam124@gmail.com");
    await page.fill('input[type="password"]', "TaskFlow2024!");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-filled.png`, fullPage: true });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    log(`After login URL: ${page.url()}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-login.png`, fullPage: true });

    // Check if we're on onboarding
    if (page.url().includes("/onboarding")) {
      log("2. Onboarding wizard (step 1)");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-onboarding-step1.png`, fullPage: true });
      
      // Check that there are only 3 steps (no notification step)
      const steps = await page.locator('[class*="rounded-full"]').count();
      log(`Step circles count: ${steps}`);
      
      // Fill step 1
      const fullNameInput = page.locator('input').first();
      const currentVal = await fullNameInput.inputValue();
      log(`Pre-filled name: "${currentVal}"`);
      
      // Click "next"
      await page.click('button:has-text("التالي")');
      await page.waitForTimeout(800);
      log("3. Onboarding step 2");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-onboarding-step2.png`, fullPage: true });
      
      await page.click('button:has-text("التالي")');
      await page.waitForTimeout(800);
      log("4. Onboarding step 3");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-onboarding-step3.png`, fullPage: true });
      
      // Click finish
      await page.click('button:has-text("ابدأ")');
      await page.waitForTimeout(3000);
      log(`After onboarding: ${page.url()}`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-onboarding.png`, fullPage: true });
    }

    // 5. Dashboard
    if (page.url().includes("/dashboard") || page.url() === `${BASE_URL}/`) {
      log("5. Dashboard");
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-dashboard.png`, fullPage: true });
    }

    // 6. Chat
    log("6. Chat page");
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    log(`Chat URL: ${page.url()}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-chat.png`, fullPage: true });

    // Try sending a message
    const messageInput = page.locator('textarea[placeholder*="رسالة"]');
    if (await messageInput.count() > 0) {
      log("Sending test message...");
      await messageInput.fill("مرحبا! اختبار للنظام الجديد 🎉");
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-chat-typing.png`, fullPage: true });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/10-chat-sent.png`, fullPage: true });
    }

    // 7. Tasks
    log("7. Tasks page");
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-tasks.png`, fullPage: true });

    // 8. Team
    log("8. Team page");
    await page.goto(`${BASE_URL}/team`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-team.png`, fullPage: true });

    // 9. New task
    log("9. New task page");
    await page.goto(`${BASE_URL}/tasks/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-new-task.png`, fullPage: true });

    log(`Errors: ${errors.length}`);
    errors.forEach((e) => log(`  ${e}`));
  } catch (e) {
    console.error("FAILED:", e.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
})();
