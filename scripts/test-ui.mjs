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
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`Console error: ${msg.text()}`);
  });

  try {
    // 1. Login page
    log("Testing /login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png`, fullPage: true });
    
    // Check key elements
    const loginH2 = await page.locator("h2").first().textContent();
    log(`Login heading: "${loginH2}"`);
    
    const featureGrid = await page.locator("text=محادثات لحظية").count();
    log(`Has new features grid: ${featureGrid > 0}`);
    
    const oldText = await page.locator("text=بوابة واحدة بين تيم العلاقات").count();
    log(`Has OLD copy: ${oldText > 0}`);

    // 2. Register page
    log("Testing /register...");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-register.png`, fullPage: true });

    // Check that role dropdown is REMOVED
    const roleDropdown = await page.locator("text=الدور في الفريق").count();
    log(`Has OLD role dropdown: ${roleDropdown > 0}`);

    // 3. Try to login with eyad's account to see the dashboard
    log("Logging in with admin account...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "eyadsyam124@gmail.com");
    await page.fill('input[type="password"]', "TaskFlow2024!");
    
    // Need a real password - let me skip and just hit the onboarding directly
    // by checking with cookie hack: just visit pages and see auth redirects
    
    // 4. Take dark mode screenshot of login
    log("Testing dark mode...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-login-dark.png`, fullPage: true });

    // 5. Check the chat-related routes redirect to login (not crash)
    log("Testing /chat (should redirect to /login)...");
    await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
    log(`URL after /chat: ${page.url()}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-chat-redirect.png`, fullPage: true });

    // 6. Print errors
    log(`Total errors: ${errors.length}`);
    errors.forEach((e) => log(`  - ${e}`));
  } catch (e) {
    console.error("TEST FAILED:", e.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
})();
