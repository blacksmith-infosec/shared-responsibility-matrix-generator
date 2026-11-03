import { expect, test } from '@playwright/test';
import { addTemplate, preparePage } from './browser-helpers';

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

const snapshotCases = [
  { name: 'desktop-light', width: 1440, height: 1000, theme: 'light' },
  { name: 'desktop-dark', width: 1440, height: 1000, theme: 'dark' },
  { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
];

for (const snapshotCase of snapshotCases) {
  for (const populated of [false, true]) {
    const state = populated ? 'populated' : 'empty';
    test(`preserves the ${snapshotCase.name} ${state} content and structure`, async ({ page }) => {
      await page.setViewportSize({ width: snapshotCase.width, height: snapshotCase.height });
      if (snapshotCase.theme === 'dark') {
        await page.locator('#theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      }
      if (populated) {
        await page.locator('#customer').fill('Example Client');
        await page.locator('#msp').fill('Example MSP');
        await page.locator('.artifact-quickstart-btn[data-tpl="m365"]').click();
        await page.locator('.system-card .card-head').click();
        await addTemplate(page, 'endpoints');
      }
      // The editor's content and semantics stay the same across themes and viewport sizes.
      await expect(page.locator('.main')).toMatchAriaSnapshot({ name: `${state}.snapshot` });
    });
  }
}
