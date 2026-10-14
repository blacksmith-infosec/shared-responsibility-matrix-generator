import { expect, type Download, type Page } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const preparePage = async (page: Page) => {
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
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
