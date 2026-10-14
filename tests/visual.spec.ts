import { expect, test } from '@playwright/test';
import { addTemplate, preparePage } from './browser-helpers';

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

const visualCases = [
  { name: 'desktop-light', width: 1440, height: 1000, theme: 'light' },
  { name: 'desktop-dark', width: 1440, height: 1000, theme: 'dark' },
  { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
];

for (const visualCase of visualCases) {
  for (const populated of [false, true]) {
    const state = populated ? 'populated' : 'empty';
    test(`visual: preserves the ${visualCase.name} ${state} appearance`, async ({ page }) => {
      await page.setViewportSize({ width: visualCase.width, height: visualCase.height });
      if (visualCase.theme === 'dark') {
        await page.locator('#theme-toggle').click();
      }
      if (populated) {
        await page.locator('#customer').fill('Example Client');
        await page.locator('#msp').fill('Example MSP');
        await page.locator('.artifact-quickstart-btn[data-tpl="m365"]').click();
        await page.locator('.system-card .card-head').click();
        await addTemplate(page, 'endpoints');
      }
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.hero-title').click();
      await expect(page).toHaveScreenshot(`${visualCase.name}-${state}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
