// tests/playwright/test-extension.spec.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '../../'); // adjust to repo root
  const userDataDir = path.join(__dirname, 'tmp-user-data');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const page = await context.newPage();
  // serve local test file or use built-in html with MCQ structure
  await page.setContent(`
    <h2>1. What is the capital of France?</h2>
    <ul>
      <li>A) Berlin</li>
      <li>B) Paris</li>
      <li>C) London</li>
      <li>D) Madrid</li>
    </ul>
  `);

  // Wait a bit for content script to detect and background to reply
  console.log('Waiting 8s for detection...');
  await page.waitForTimeout(8000);

  // Optionally screenshot to inspect overlay
  await page.screenshot({ path: 'tests/playwright/result.png', fullPage: true });

  console.log('Done. Open screenshot at tests/playwright/result.png');
  await context.close();
})();
