import { expect, type Download, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fontFixtures = new URL('./fixtures/fonts/', import.meta.url);

export const preparePage = async (page: Page) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
  // Preserve the application's web fonts without depending on Google's availability.
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    path: fileURLToPath(new URL('google-fonts.css', fontFixtures)),
    contentType: 'text/css',
  }));
  await page.route('https://fonts.gstatic.com/**/*.woff2', (route) => {
    const filename = basename(new URL(route.request().url()).pathname);
    return route.fulfill({
      path: fileURLToPath(new URL(filename, fontFixtures)),
      contentType: 'font/woff2',
    });
  });
  // Serve the original app's CDN libraries from installed packages so its
  // characterization checks stay independent of external network access.
  await page.route('**/cdnjs.cloudflare.com/ajax/libs/html2canvas/**', (route) => route.fulfill({
    path: require.resolve('html2canvas/dist/html2canvas.min.js'),
    contentType: 'application/javascript',
  }));
  await page.route('**/cdnjs.cloudflare.com/ajax/libs/jspdf/**', (route) => route.fulfill({
    path: require.resolve('jspdf/dist/jspdf.umd.min.js'),
    contentType: 'application/javascript',
  }));
  await page.goto('/');
  await expect(page.locator('.artifact-empty-title')).toHaveText('Start with a template');
  await page.evaluate(() => document.fonts.ready);
};

export const addTemplate = async (page: Page, templateId: string) => {
  await page.locator('#add-system-btn').click();
  await page.locator(`#add-menu .menu-item[data-tpl="${templateId}"]`).click();
};

export const readDownload = async (download: Download) => {
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error(`Download was unavailable: ${download.suggestedFilename()}`);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
