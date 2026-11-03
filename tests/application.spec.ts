import { expect, test } from '@playwright/test';
import { addTemplate, preparePage, readDownload } from './browser-helpers';

const categories = ['data', 'identity', 'endpoint', 'network', 'app', 'backup', 'logging', 'incident'];
const templates = [
  { id: 'm365', name: 'Microsoft 365', vendor: 'Microsoft', assignments: ['vmc', 'mc', '', 'vm', 'vm', 'vmc', 'vm', 'mc'] },
  { id: 'entra', name: 'Microsoft Entra ID', vendor: 'Microsoft', assignments: ['vmc', 'vmc', '', 'v', 'vm', 'vmc', 'vm', 'mc'] },
  { id: 'azure', name: 'Microsoft Azure', vendor: 'Microsoft', assignments: ['vmc', 'mc', 'm', 'vm', 'vm', 'c', 'vm', 'mc'] },
  { id: 'aws', name: 'Amazon Web Services (AWS)', vendor: 'Amazon Web Services', assignments: ['vmc', 'vmc', 'm', 'vm', 'vm', 'c', 'vm', 'mc'] },
  { id: 'gworkspace', name: 'Google Workspace', vendor: 'Google', assignments: ['vmc', 'vmc', '', 'vm', 'vm', 'vmc', 'vm', 'mc'] },
  { id: 'endpoints', name: 'Windows endpoints', vendor: 'Microsoft', assignments: ['mc', 'mc', 'm', '', 'vm', 'vmc', 'm', 'mc'] },
  { id: 'network', name: 'Fortinet FortiGate', vendor: 'Fortinet', assignments: ['vm', 'mc', '', 'vm', 'm', 'm', 'm', 'mc'] },
  { id: 'backup', name: 'Datto SIRIS', vendor: 'Datto', assignments: ['vm', 'vm', '', 'vm', 'vm', 'vmc', 'm', 'mc'] },
  { id: 'saas', name: 'Salesforce Starter Suite', vendor: 'Salesforce', assignments: ['vmc', 'vmc', '', 'vm', 'vm', 'vmc', 'm', 'mc'] },
  {
    id: 'intune', name: 'Microsoft Intune', vendor: 'Microsoft',
    assignments: ['vmc', 'mc', 'vm', 'vm', 'vm', 'm', 'vm', 'mc'],
  },
  {
    id: 'defender', name: 'Microsoft Defender for Business', vendor: 'Microsoft',
    assignments: ['vmc', 'mc', 'vm', 'vm', 'vm', '', 'vm', 'vmc'],
  },
  {
    id: 'huntress', name: 'Huntress Managed EDR', vendor: 'Huntress',
    assignments: ['vm', 'vm', 'vm', 'v', 'vm', '', 'vm', 'vmc'],
  },
  {
    id: 'sentinelone', name: 'SentinelOne Singularity Complete', vendor: 'SentinelOne',
    assignments: ['vm', 'vm', 'm', 'v', 'vm', 'm', 'vm', 'mc'],
  },
  {
    id: 'sonicwall', name: 'SonicWall TZ Series', vendor: 'SonicWall',
    assignments: ['vm', 'mc', '', 'vm', 'm', 'm', 'm', 'mc'],
  },
  {
    id: 'unifi', name: 'UniFi Cloud Gateway', vendor: 'Ubiquiti',
    assignments: ['vm', 'vmc', '', 'm', 'm', 'vm', 'm', 'mc'],
  },
  {
    id: 'dnsfilter', name: 'DNSFilter', vendor: 'DNSFilter',
    assignments: ['vm', 'vm', '', 'vmc', 'vm', 'm', 'vm', 'mc'],
  },
  {
    id: 'datto-saas', name: 'Datto SaaS Protection', vendor: 'Datto',
    assignments: ['vm', 'vm', '', 'v', 'vm', 'vmc', 'vm', 'mc'],
  },
  {
    id: 'cove', name: 'Cove Data Protection', vendor: 'N-able',
    assignments: ['vm', 'vm', '', 'vm', 'vm', 'vmc', 'vm', 'mc'],
  },
  {
    id: '1password', name: '1Password Business', vendor: '1Password',
    assignments: ['vmc', 'vmc', '', 'v', 'v', 'vmc', 'vm', 'mc'],
  },
  {
    id: 'quickbooks', name: 'QuickBooks Online', vendor: 'Intuit',
    assignments: ['vc', 'vmc', '', 'v', '', 'c', 'vc', 'c'],
  },
  {
    id: 'hubspot', name: 'HubSpot Smart CRM', vendor: 'HubSpot',
    assignments: ['vmc', 'vmc', '', 'v', 'vm', 'vmc', 'vm', 'mc'],
  },
  {
    id: 'slack', name: 'Slack', vendor: 'Slack',
    assignments: ['vmc', 'vmc', '', 'v', 'vm', 'c', 'vm', 'mc'],
  },
  {
    id: 'zoom', name: 'Zoom Workplace', vendor: 'Zoom',
    assignments: ['vmc', 'vmc', '', 'v', 'vm', 'vmc', 'vm', 'mc'],
  },
];

test.use({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('starts with the empty form, preview, and common client quickstarts', async ({ page }) => {
  await expect(page).toHaveTitle('Shared Responsibility Matrix Generator · Blacksmith InfoSec');
  await expect(page.locator('.hero-title')).toHaveText('Who owns what for this client.');
  await expect(page.locator('#form-empty')).toContainText('No systems yet.');
  await expect(page.locator('#system-count')).toBeEmpty();
  await expect(page.locator('#reset-all')).toBeHidden();
  await expect(page.locator('#artifact-customer')).toHaveText('Customer name');
  await expect(page.locator('#artifact-msp')).toHaveText('MSP name');
  await expect(page.locator('#artifact-date')).toHaveText('October 2026');
  await expect(page.locator('.artifact-quickstart-btn')).toHaveText([
    'Microsoft 365', 'Windows endpoints', 'Fortinet FortiGate', 'Datto SIRIS',
  ]);
  await expect(page.locator('.legend-item')).toHaveCount(4);
  await expect(page.locator('.output-disclaimer')).toContainText('Confirm specific responsibility splits');
});

test('updates client branding immediately and restores Unicode from a bookmarked URL', async ({ page }) => {
  await page.locator('#customer').fill('München 客户 🔒');
  await page.locator('#msp').fill('Sécurité & Partners');
  await expect(page.locator('#artifact-customer')).toHaveText('München 客户 🔒');
  await expect(page.locator('#artifact-msp')).toHaveText('Sécurité & Partners');
  await addTemplate(page, '');
  const card = page.locator('.system-card');
  await card.locator('.js-name').fill('Système 数据');
  await card.locator('.js-vendor').fill('Équipe "Cloud"');
  await card.locator('[data-cat="data"][data-party="m"]').click();
  await card.locator('[data-cat="data"][data-party="c"]').click();
  await card.locator('[data-cat="incident"][data-party="c"]').click();
  await card.locator('[data-cat="incident"][data-party="v"]').click();
  await expect.poll(() => new URL(page.url()).hash).not.toBe('');
  await expect.poll(async () => {
    const hash = new URL(page.url()).hash.slice(1);
    return JSON.parse(Buffer.from(hash, 'base64').toString('utf8')).s[0];
  }).toMatchObject({
    n: 'Système 数据',
    v: 'Équipe "Cloud"',
    a: ['mc', '', '', '', '', '', '', 'cv'],
  });
  await page.reload();
  await expect(page.locator('#customer')).toHaveValue('München 客户 🔒');
  await expect(page.locator('#msp')).toHaveValue('Sécurité & Partners');
  await expect(card.locator('.card-name-display')).toHaveText('Système 数据');
  await expect(card.locator('.card-vendor-display')).toHaveText('Équipe "Cloud"');
  await expect(card).not.toHaveClass(/expanded/);
  await card.locator('.card-head').click();
  await expect(card.locator('[data-cat="data"][data-party="m"]')).toHaveClass(/on/);
  await expect(card.locator('[data-cat="data"][data-party="c"]')).toHaveClass(/on/);
  await expect(card.locator('[data-cat="incident"][data-party="v"]')).toHaveClass(/on/);
  await expect(card.locator('[data-cat="incident"][data-party="c"]')).toHaveClass(/on/);
  await expect(card.locator('[data-cat="incident"][data-party="m"]')).not.toHaveClass(/on/);
});

test('preserves bookmarked matrix names and assignments when their templates are renamed', async ({ page }) => {
  const bookmarkedState = {
    c: 'Existing client',
    m: 'Existing MSP',
    s: [{
      n: 'Endpoints',
      v: 'MS Defender',
      t: 'endpoints',
      a: ['mc', 'm', 'm', 'm', 'm', 'm', 'm'],
    }],
  };
  const hash = Buffer.from(JSON.stringify(bookmarkedState), 'utf8').toString('base64');
  await page.goto(`/#${hash}`);
  await page.reload();
  const card = page.locator('.system-card');
  await expect(card.locator('.card-name-display')).toHaveText('Endpoints');
  await expect(card.locator('.card-vendor-display')).toHaveText('MS Defender');
  await expect(page.locator('#matrix .m-rlabel')).toContainText('Endpoints');
  await card.locator('.card-toggle').click();
  await expect(card.locator('[data-cat="endpoint"][data-party="m"]')).toHaveClass(/on/);
  await expect(card.locator('[data-cat="endpoint"][data-party="v"]')).not.toHaveClass(/on/);
  await expect(card.locator('[data-cat="logging"][data-party="m"]')).toHaveClass(/on/);
  for (const party of ['v', 'm', 'c']) {
    await expect(card.locator(`[data-cat="incident"][data-party="${party}"]`)).not.toHaveClass(/on/);
  }
  await expect(page.locator('#matrix .m-cell').last()).toHaveAccessibleName('Unassigned');
  await page.locator('#add-system-btn').click();
  await expect(page.locator('#add-menu [data-tpl="endpoints"]')).toHaveCount(0);
  await page.locator('#add-system-btn').click();
  await card.locator('.card-remove').click();
  await page.locator('#add-system-btn').click();
  await expect(page.locator('#add-menu [data-tpl="endpoints"]')).toBeVisible();
  await expect(page.locator('#add-menu [data-tpl="endpoints"] > span:first-child')).toHaveText('Windows endpoints');
});

test('offers every client-facing template with its defaults and excludes templates already in use', async ({ page }) => {
  await page.locator('#add-system-btn').click();
  await expect(page.locator('#add-menu .menu-item')).toHaveCount(templates.length + 1);
  await expect(page.locator('#add-menu .menu-item > span:first-child')).toHaveText([
    'Custom (blank)', ...templates.map((template) => template.name),
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const templateId of ['defender', 'sentinelone']) {
    const item = page.locator(`#add-menu [data-tpl="${templateId}"]`);
    const label = item.locator('span').first();
    await item.scrollIntoViewIfNeeded();
    const dimensions = await label.evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
      contentWidth: element.scrollWidth,
      contentHeight: element.scrollHeight,
    }));
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.height);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#add-system-btn').click();

  for (const template of templates) {
    await addTemplate(page, template.id);
    const card = page.locator('.system-card').last();
    await expect(card.locator('.js-name')).toHaveValue(template.name);
    await expect(card.locator('.js-vendor')).toHaveValue(template.vendor);
    for (const [categoryIndex, category] of categories.entries()) {
      for (const party of ['v', 'm', 'c']) {
        const toggle = card.locator(`[data-cat="${category}"][data-party="${party}"]`);
        if (template.assignments[categoryIndex].includes(party)) {
          await expect(toggle).toHaveClass(/on/);
        } else {
          await expect(toggle).not.toHaveClass(/on/);
        }
      }
    }
    await card.locator('.card-head').click();
    await page.locator('#add-system-btn').click();
    await expect(page.locator(`#add-menu [data-tpl="${template.id}"]`)).toHaveCount(0);
    await page.locator('#add-system-btn').click();
  }

  await expect(page.locator('#system-count')).toHaveText('23 systems');
  await expect(page.locator('#matrix .m-rlabel')).toHaveCount(23);
  await page.locator('#add-system-btn').click();
  await expect(page.locator('#add-menu .menu-item')).toHaveCount(1);
  await expect(page.locator('#add-menu .menu-item')).toContainText('Custom (blank)');
  await page.locator('#add-system-btn').click();
  await page.locator('.system-card').first().locator('.card-remove').click();
  await page.locator('#add-system-btn').click();
  await expect(page.locator('#add-menu [data-tpl="m365"]')).toBeVisible();
});

test('adds, edits, collapses, and removes a custom system with shared responsibility toggles', async ({ page }) => {
  await addTemplate(page, '');
  const card = page.locator('.system-card');
  await expect(card).toHaveClass(/expanded/);
  await expect(card.locator('.card-name-display')).toHaveText('Untitled system');
  await expect(page.locator('#system-count')).toHaveText('1 system');
  await expect(page.locator('#matrix .na')).toHaveCount(8);
  await card.locator('.js-name').fill('CRM & "Sales" <suite>');
  await card.locator('.js-vendor').fill('Example, Inc.');
  await expect(page.locator('#matrix .m-rlabel')).toContainText('CRM & "Sales" <suite>');
  await expect(page.locator('#matrix .m-rsub')).toHaveText('Example, Inc.');

  const dataCell = page.locator('#matrix .m-cell').first();
  for (const party of ['v', 'm', 'c']) {
    await card.locator(`[data-cat="data"][data-party="${party}"]`).click();
    await expect(dataCell.locator(`.dot.${party}`)).toHaveClass(/on/);
  }
  await card.locator('[data-cat="data"][data-party="m"]').click();
  await expect(dataCell.locator('.dot.m')).toHaveClass(/off/);
  await expect(dataCell.locator('.dot.v')).toHaveClass(/on/);
  await expect(dataCell.locator('.dot.c')).toHaveClass(/on/);
  await card.locator('.card-toggle').click();
  await expect(card.locator('.card-body')).toBeHidden();
  await card.locator('.card-toggle').click();
  await expect(card.locator('.card-body')).toBeVisible();
  await card.locator('.card-remove').click();
  await expect(page.locator('.system-card')).toHaveCount(0);
  await expect(page.locator('#form-empty')).toBeVisible();
  await expect(page.locator('.artifact-empty')).toBeVisible();
  await expect(page.locator('#reset-all')).toBeHidden();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await page.locator('.artifact-quickstart-btn[data-tpl="network"]').click();
  await expect(page.locator('.card-name-display')).toHaveText('Fortinet FortiGate');
});

test('keeps theme and uploaded logo preferences across reloads and removes the logo on request', async ({ page }) => {
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const logo = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#44c8f5"/></svg>';
  await page.locator('#logo-file-input').setInputFiles({
    name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(logo),
  });
  await expect(page.locator('#artifact-msp-logo img')).toBeVisible();
  await expect(page.locator('#logo-upload-preview img')).toBeVisible();
  await expect(page.locator('#logo-clear-btn')).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#artifact-msp-logo img')).toBeVisible();
  await page.locator('#logo-clear-btn').click();
  await expect(page.locator('#artifact-msp-logo img')).toHaveCount(0);
  await expect(page.locator('#logo-clear-btn')).toBeHidden();
  await page.reload();
  await expect(page.locator('#artifact-msp-logo img')).toHaveCount(0);
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('cancels or confirms resetting the client, systems, and saved URL', async ({ page }) => {
  await page.locator('#customer').fill('Example Client');
  await page.locator('#msp').fill('Example MSP');
  await page.locator('.artifact-quickstart-btn[data-tpl="m365"]').click();
  await expect.poll(() => new URL(page.url()).hash).not.toBe('');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#reset-all').click();
  await expect(page.locator('#customer')).toHaveValue('Example Client');
  await expect(page.locator('.system-card')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#reset-all').click();
  await expect(page.locator('#customer')).toHaveValue('');
  await expect(page.locator('#msp')).toHaveValue('');
  await expect(page.locator('.system-card')).toHaveCount(0);
  await expect(page.locator('#reset-all')).toBeHidden();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await page.reload();
  await expect(page.locator('.artifact-empty')).toBeVisible();
});

test('blocks exports for an empty matrix with an actionable message', async ({ page }) => {
  for (const format of ['png', 'pdf', 'csv']) {
    const dialogPromise = page.waitForEvent('dialog');
    const clickPromise = page.locator(`#download-${format}`).click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Add at least one system before exporting.');
    await dialog.accept();
    await clickPromise;
  }
});

test('downloads correctly quoted CSV and valid PNG and PDF files', async ({ page }) => {
  await page.locator('#customer').fill('Example & Partners');
  await addTemplate(page, '');
  const card = page.locator('.system-card');
  await card.locator('.js-name').fill('CRM, "Sales"');
  await card.locator('.js-vendor').fill('Example, Inc.');
  // Click out of canonical order to check the exported party code ordering.
  for (const party of ['c', 'v', 'm']) {
    await card.locator(`[data-cat="data"][data-party="${party}"]`).click();
  }
  await card.locator('[data-cat="incident"][data-party="c"]').click();
  await card.locator('[data-cat="incident"][data-party="m"]').click();
  const csvPromise = page.waitForEvent('download');
  await page.locator('#download-csv').click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe('srm-example-partners.csv');
  expect((await readDownload(csv)).toString('utf8')).toBe(
    'System,Vendor,Data classification,Identity access,Endpoint protection,Network controls,App security & patching,Backup recovery,Logging & monitoring,Incident response support\r\n'
    + '"CRM, ""Sales""","Example, Inc.",VMC,,,,,,,MC',
  );

  const pngPromise = page.waitForEvent('download');
  await page.locator('#download-png').click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe('srm-example-partners.png');
  const pngBytes = await readDownload(png);
  expect(pngBytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(pngBytes.readUInt32BE(16)).toBeGreaterThan(1000);
  await expect(page.locator('#download-png')).toBeEnabled();
  await expect(page.locator('#artifact')).not.toHaveClass(/is-exporting/);

  const pdfPromise = page.waitForEvent('download');
  await page.locator('#download-pdf').click();
  const pdf = await pdfPromise;
  expect(pdf.suggestedFilename()).toBe('srm-example-partners.pdf');
  const pdfBytes = await readDownload(pdf);
  expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pageSize = pdfBytes.toString('latin1').match(/\/MediaBox \[([^\]]+)\]/)?.[1].split(/\s+/).map(Number);
  expect(pageSize).toEqual([0, 0, 792, 612]);
  await expect(page.locator('#download-pdf')).toBeEnabled();
  await expect(page.locator('#artifact')).not.toHaveClass(/is-exporting/);
});

test('exports shared-link system names and vendors as text instead of spreadsheet formulas', async ({ page }) => {
  const sharedState = {
    c: 'Shared client',
    m: '',
    s: [{ n: '=1+1', v: '+1+1', t: null, a: ['', '', '', '', '', '', ''] }],
  };
  const hash = Buffer.from(JSON.stringify(sharedState), 'utf8').toString('base64');
  await page.goto(`/#${hash}`);
  await page.reload();
  await expect(page.locator('.card-name-display')).toHaveText('=1+1');
  await expect(page.locator('.card-vendor-display')).toHaveText('+1+1');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-csv').click();
  const csv = (await readDownload(await downloadPromise)).toString('utf8');
  expect(csv.split('\r\n')[1]).toBe("'=1+1,'+1+1,,,,,,,,");
});

