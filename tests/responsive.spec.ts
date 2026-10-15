import { expect, test, type Page } from '@playwright/test';
import { preparePage, readDownload } from './browser-helpers';

interface MarkerCounts {
  firstCell: number;
  lastCell: number;
}

const countPngMarkerPixels = async (page: Page, png: Buffer): Promise<MarkerCounts> => (
  page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable while checking exported PNG');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const markerPixels = { firstCell: 0, lastCell: 0 };
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] === 0 && pixels[index + 1] === 255 && pixels[index + 2] === 255) markerPixels.firstCell += 1;
      if (pixels[index] === 255 && pixels[index + 1] === 0 && pixels[index + 2] === 255) markerPixels.lastCell += 1;
    }
    return markerPixels;
  }, png.toString('base64'))
);

const readPdfInteger = (dictionary: string, field: string): number => {
  const value = dictionary.match(new RegExp(`/${field} (\\d+)`));
  if (!value) throw new Error(`Exported PDF image is missing ${field}`);
  return Number(value[1]);
};

const countPdfMarkerPixels = (pdf: Buffer): MarkerCounts => {
  const pdfText = pdf.toString('latin1');
  const imageIndex = pdfText.indexOf('/Subtype /Image');
  if (imageIndex === -1) throw new Error('Exported PDF does not contain an image');
  const dictionaryStart = pdfText.lastIndexOf('<<', imageIndex);
  const dictionaryEnd = pdfText.indexOf('>>', imageIndex);
  const dictionary = pdfText.slice(dictionaryStart, dictionaryEnd);
  // jsPDF embeds this canvas as uncompressed RGB. Check that contract before reading its pixels.
  expect(dictionary).toContain('/ColorSpace /DeviceRGB');
  expect(dictionary).not.toContain('/Filter');
  expect(readPdfInteger(dictionary, 'BitsPerComponent')).toBe(8);
  const width = readPdfInteger(dictionary, 'Width');
  const height = readPdfInteger(dictionary, 'Height');
  const length = readPdfInteger(dictionary, 'Length');
  expect(length).toBe(width * height * 3);
  const streamIndex = pdfText.indexOf('stream\n', dictionaryEnd);
  if (streamIndex === -1) throw new Error('Exported PDF image has no pixel stream');
  const pixelStart = streamIndex + 'stream\n'.length;
  const pixels = pdf.subarray(pixelStart, pixelStart + length);
  expect(pixels).toHaveLength(length);
  const markerPixels = { firstCell: 0, lastCell: 0 };
  for (let index = 0; index < pixels.length; index += 3) {
    if (pixels[index] === 0 && pixels[index + 1] === 255 && pixels[index + 2] === 255) markerPixels.firstCell += 1;
    if (pixels[index] === 255 && pixels[index + 1] === 0 && pixels[index + 2] === 255) markerPixels.lastCell += 1;
  }
  return markerPixels;
};

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await preparePage(page);
  await page.getByRole('button', { name: 'Microsoft 365', exact: true }).click();
});

for (const width of [390, 768, 1000]) {
  test(`keeps all responsibility columns reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const table = page.locator('#matrix');
    const preview = table.locator('..');
    const headers = table.locator('.m-hcell');
    const cells = table.locator('.m-cell');
    await expect(headers).toHaveCount(8);
    await expect(cells).toHaveCount(7);
    const headerPositions = await headers.evaluateAll((elements) => (
      elements.map((element) => element.getBoundingClientRect().y)
    ));
    const cellPositions = await cells.evaluateAll((elements) => (
      elements.map((element) => element.getBoundingClientRect().y)
    ));
    expect(new Set(headerPositions.map(Math.round)).size, 'category headers must share one row').toBe(1);
    expect(new Set(cellPositions.map(Math.round)).size, 'responsibility cells must share one row').toBe(1);
    await preview.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => preview.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await preview.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const bounds = await preview.boundingBox();
    const logging = await headers.last().boundingBox();
    expect(bounds).not.toBeNull();
    expect(logging).not.toBeNull();
    if (!bounds || !logging) throw new Error('Matrix preview or final column is not rendered');
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(logging.x).toBeGreaterThanOrEqual(bounds.x - 1);
    expect(logging.x + logging.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  });
}

for (const format of ['png', 'pdf'] as const) {
  test(`includes the final responsibility column in a narrow-screen ${format.toUpperCase()} export`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const table = page.locator('#matrix');
    const preview = table.locator('..');
    await preview.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const originalLayout = await preview.evaluate((element) => ({
      width: element.getBoundingClientRect().width, scrollLeft: element.scrollLeft,
    }));
    expect(originalLayout.scrollLeft, 'the preview must start scrolled to the final column').toBeGreaterThan(0);
    const firstCell = table.locator('.m-cell').first();
    const finalCell = table.locator('.m-cell').last();
    // Distinct colors at both ends expose clipped exports without OS-specific image snapshots.
    await firstCell.evaluate((element) => { element.style.backgroundColor = 'rgb(0, 255, 255)'; });
    await finalCell.evaluate((element) => { element.style.backgroundColor = 'rgb(255, 0, 255)'; });
    await expect(firstCell).toHaveCSS('background-color', 'rgb(0, 255, 255)');
    await expect(finalCell).toHaveCSS('background-color', 'rgb(255, 0, 255)');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: format.toUpperCase(), exact: true }).click();
    const exportedFile = await readDownload(await downloadPromise);
    const markerPixels = format === 'png'
      ? await countPngMarkerPixels(page, exportedFile)
      : countPdfMarkerPixels(exportedFile);
    expect(markerPixels.firstCell, 'the exported file must contain the first responsibility cell').toBeGreaterThan(1000);
    expect(markerPixels.lastCell, 'the exported file must contain the final responsibility cell').toBeGreaterThan(1000);
    expect(await preview.evaluate((element) => ({
      width: element.getBoundingClientRect().width, scrollLeft: element.scrollLeft,
    }))).toEqual(originalLayout);
  });
}
