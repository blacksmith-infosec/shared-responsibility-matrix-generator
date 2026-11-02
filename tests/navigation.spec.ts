import { expect, test } from '@playwright/test';
import { addTemplate, preparePage } from './browser-helpers';

const legacyHash = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
const currentHash = (url: string) => decodeURIComponent(new URL(url).hash.slice(1));

test.use({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('navigating to a damaged link before a pending save leaves it untouched, then a valid link loads and saves', async ({ page }) => {
  await page.locator('#customer').fill('Matrix A');
  // Navigate within the same document before the 400 ms debounce fires.
  await page.evaluate(() => { location.hash = '2.damaged!!'; });
  await expect(page.locator('#start-new-matrix')).toBeVisible();
  await page.waitForTimeout(1200);
  expect(currentHash(page.url())).toBe('2.damaged!!');

  const linkC = legacyHash({ c: 'Matrix C', s: [{ n: 'Row C', a: ['m'] }] });
  await page.evaluate((hash) => { location.hash = hash; }, linkC);
  await expect(page.locator('#customer')).toHaveValue('Matrix C');
  await page.locator('#customer').fill('Matrix C edited');
  await expect.poll(() => currentHash(page.url()).startsWith('2.')).toBe(true);
  await page.reload();
  await expect(page.locator('#customer')).toHaveValue('Matrix C edited');
  await expect(page.locator('.card-name-display')).toHaveText('Row C');
});

test('a link from a newer version is preserved and only replaced by starting a new matrix', async ({ page }) => {
  await page.goto('/#9.fromthefuture');
  await expect(page.getByRole('alert')).toContainText('newer version');
  await page.waitForTimeout(800);
  expect(currentHash(page.url())).toBe('9.fromthefuture');
  await page.locator('#start-new-matrix').click();
  await expect(page.locator('#customer')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
});

test('back and forward move between two saved matrices without a reload', async ({ page }) => {
  const linkA = legacyHash({ c: 'Client A', s: [{ n: 'Row A', a: ['m'] }] });
  const linkB = legacyHash({ c: 'Client B', s: [{ n: 'Row B', a: ['v'] }] });
  await page.goto(`/#${linkA}`);
  await expect(page.locator('#customer')).toHaveValue('Client A');
  await page.evaluate((hash) => { location.hash = hash; }, linkB);
  await expect(page.locator('#customer')).toHaveValue('Client B');
  await page.goBack();
  await expect(page.locator('#customer')).toHaveValue('Client A');
  await page.goForward();
  await expect(page.locator('#customer')).toHaveValue('Client B');
});

test('a migrated v1 row shows review messages and keeps them until marked reviewed', async ({ page }) => {
  await page.goto(`/#${legacyHash({ c: 'Old', s: [{ n: 'Mail', t: 'm365', a: ['m', '', '', '', '', '', 'vm'] }] })}`);
  await expect(page.locator('#matrix-status')).toHaveText('Draft');
  const card = page.locator('.system-card');
  await card.locator('.card-toggle').click();
  await expect(card.locator('.review-flags')).toContainText('Category definitions changed');
  await expect(card.locator('.review-provenance')).toContainText('Logging & response: V M');
  await card.locator('[data-cat="data"][data-party="c"]').click();
  await expect(card.locator('.review-flags')).toBeVisible();
  await card.locator('.js-reviewed').click();
  await expect(card.locator('.review-flags')).toHaveCount(0);
  await expect.poll(() => currentHash(page.url()).startsWith('2.')).toBe(true);
  await page.reload();
  await card.locator('.card-toggle').click();
  await expect(card.locator('.review-flags')).toHaveCount(0);
  await expect(card.locator('[data-cat="data"][data-party="c"]')).toHaveClass(/on/);
});

test('a new matrix is dated today and a custom row starts unassigned in every column', async ({ page }) => {
  await expect(page.locator('#prepared-date')).toHaveValue('2026-10-14');
  await addTemplate(page, '');
  const states = page.locator('.system-card .cell-state');
  await expect(states).toHaveCount(8);
  for (const value of await states.evaluateAll((elements) => elements.map((element) => (element as HTMLSelectElement).value))) {
    expect(value).toBe('unassigned');
  }
});
