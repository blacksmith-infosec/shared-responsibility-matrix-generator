import { expect, test } from '@playwright/test';
import { preparePage } from './browser-helpers';

test('loads the application web fonts when external font services are unavailable', async ({ context, page }) => {
  await context.route('https://fonts.googleapis.com/**', (route) => route.abort('internetdisconnected'));
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort('internetdisconnected'));

  await preparePage(page);

  const loadedFontCounts = await page.evaluate(async () => {
    const fonts = [
      ...[300, 400, 500, 600, 700, 800].map((weight) => `${weight} 16px Alexandria`),
      ...[400, 500].map((weight) => `${weight} 16px "JetBrains Mono"`),
    ];
    return Promise.all(fonts.map(async (font) => (await document.fonts.load(font)).length));
  });

  expect(loadedFontCounts).toEqual(Array.from({ length: 8 }, () => 1));
});
