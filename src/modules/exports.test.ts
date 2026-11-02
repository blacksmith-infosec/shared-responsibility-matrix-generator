import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSystem } from './matrix';
import { createCsv, createFilename, downloadCsv, downloadImage } from './exports';

describe('CSV export', () => {
  it('preserves headers, CRLF rows, escaping and canonical party order', () => {
    const system = createSystem(1);
    system.name = 'Mail, "Primary"';
    system.vendor = 'Line\nTwo';
    system.cells.data = { parties: ['v', 'm', 'c'], state: 'assigned' };
    expect(createCsv([system])).toBe(
      'System,Vendor,Data protection,Identity & access,Endpoint security,Network security,' +
      'Configuration & patching,Backup & recovery,Monitoring & detection,Incident response\r\n' +
      '"Mail, ""Primary""","Line\nTwo",VMC,,,,,,,',
    );
  });

  it.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1+1', '\r=1+1', '   =1+1']) (
    'exports spreadsheet formulas as literal text: %s', (name) => {
      const system = { ...createSystem(1), name, vendor: name };
      const row = createCsv([system]).split('\r\n')[1];
      expect(row).toContain(`'${name}`);
    },
  );

  it.each(['＝1+1', '＋SUM(A1)', '－1+2', '＠SUM(A1)', '   ＝1+1'])(
    'exports full-width spreadsheet formula prefixes as literal text: %s', (value) => {
      const system = { ...createSystem(1), name: value, vendor: value };
      const row = createCsv([system]).split('\r\n')[1];
      expect(row).toBe(`'${value},'${value},,,,,,,,`);
    },
  );

  it('keeps ordinary text intact', () => {
    const system = { ...createSystem(1), name: 'Microsoft 365', vendor: 'Vendor' };
    expect(createCsv([system])).toContain('\r\nMicrosoft 365,Vendor,');
  });

  it.each([['Acme, Inc.', 'srm-acme-inc.pdf'], ['', 'srm-matrix.pdf'], ['東京', 'srm-matrix.pdf']])(
    'creates stable download filenames for %s', (customer, expected) => {
      expect(createFilename(customer, 'pdf')).toBe(expected);
    },
  );
});

const readBlobText = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

describe('CSV downloads', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    createObjectURL.mockReset().mockReturnValue('blob:matrix-download');
    revokeObjectURL.mockReset();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('downloads the CSV contents and filename, then releases its object URL', async () => {
    const system = { ...createSystem(1), name: 'Client email', vendor: 'Microsoft' };
    system.cells.identity = { parties: ['v', 'm'], state: 'assigned' };
    const clickedLinks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
      expect(revokeObjectURL).not.toHaveBeenCalled();
    });

    downloadCsv([system], 'Acme, Inc.');

    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].href).toBe('blob:matrix-download');
    expect(clickedLinks[0].download).toBe('srm-acme-inc.csv');
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(await readBlobText(blob)).toBe(
      'System,Vendor,Data protection,Identity & access,Endpoint security,Network security,' +
      'Configuration & patching,Backup & recovery,Monitoring & detection,Incident response\r\n' +
      'Client email,Microsoft,,VM,,,,,,',
    );
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:matrix-download');
  });

  it('releases the object URL when the browser cannot start the download', () => {
    const failure = new Error('Download blocked');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw failure; });

    expect(() => downloadCsv([createSystem(1)], 'Client')).toThrow(failure);
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:matrix-download');
  });
});

describe('image downloads', () => {
  const imageData = 'data:image/png;base64,bWF0cml4';
  const renderCanvas = vi.fn();
  const addImage = vi.fn();
  const savePdf = vi.fn();
  const pdfConstructor = vi.fn(class {
    internal = { pageSize: { getWidth: () => 792, getHeight: () => 612 } };
    addImage = addImage;
    save = savePdf;
  });
  let artifact: HTMLElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.resetModules();
    renderCanvas.mockReset();
    addImage.mockReset();
    savePdf.mockReset();
    pdfConstructor.mockClear();
    vi.doMock('html2canvas', () => ({ default: renderCanvas }));
    vi.doMock('jspdf', () => ({ jsPDF: pdfConstructor }));
    artifact = document.createElement('div');
    artifact.className = 'artifact';
    canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    vi.spyOn(canvas, 'toDataURL').mockReturnValue(imageData);
    renderCanvas.mockResolvedValue(canvas);
  });

  afterEach(() => {
    vi.doUnmock('html2canvas');
    vi.doUnmock('jspdf');
    vi.resetModules();
  });

  it('downloads a white-background PNG and restores the artifact after capture', async () => {
    const clickedLinks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
      expect(artifact).toHaveClass('is-exporting');
    });

    await downloadImage(artifact, 'Acme, Inc.', 'png');

    expect(renderCanvas).toHaveBeenCalledExactlyOnceWith(artifact, {
      backgroundColor: '#FFFFFF', scale: 2, logging: false, useCORS: true,
      onclone: expect.any(Function),
    });
    expect(canvas.toDataURL).toHaveBeenCalledExactlyOnceWith('image/png');
    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].href).toBe(imageData);
    expect(clickedLinks[0].download).toBe('srm-acme-inc.png');
    expect(pdfConstructor).not.toHaveBeenCalled();
    expect(artifact.className).toBe('artifact');
  });

  it.each([
    { shape: 'wide', width: 2400, height: 800, expectedWidth: 736, expectedHeight: 736 / 3 },
    { shape: 'tall', width: 800, height: 2400, expectedWidth: 556 / 3, expectedHeight: 556 },
  ])('fits a $shape matrix inside a centered landscape-letter PDF', async (fixture) => {
    canvas.width = fixture.width;
    canvas.height = fixture.height;

    await downloadImage(artifact, 'Client', 'pdf');

    expect(pdfConstructor).toHaveBeenCalledExactlyOnceWith({
      orientation: 'landscape', unit: 'pt', format: 'letter',
    });
    expect(addImage).toHaveBeenCalledTimes(1);
    const [data, format, x, y, width, height] = addImage.mock.calls[0];
    expect(data).toBe(imageData);
    expect(format).toBe('PNG');
    expect(width).toBeCloseTo(fixture.expectedWidth);
    expect(height).toBeCloseTo(fixture.expectedHeight);
    expect(x).toBeCloseTo((792 - fixture.expectedWidth) / 2);
    expect(y).toBeCloseTo((612 - fixture.expectedHeight) / 2);
    expect(x).toBeGreaterThanOrEqual(28);
    expect(y).toBeGreaterThanOrEqual(28);
    expect(x + width).toBeLessThanOrEqual(792 - 28);
    expect(y + height).toBeLessThanOrEqual(612 - 28);
    expect(width / height).toBeCloseTo(fixture.width / fixture.height);
    expect(savePdf).toHaveBeenCalledExactlyOnceWith('srm-client.pdf');
    expect(artifact.className).toBe('artifact');
  });

  it('restores the artifact and rejects when canvas rendering fails', async () => {
    const failure = new Error('Image capture failed');
    renderCanvas.mockRejectedValue(failure);

    await expect(downloadImage(artifact, 'Client', 'png')).rejects.toBe(failure);

    expect(artifact.className).toBe('artifact');
    expect(pdfConstructor).not.toHaveBeenCalled();
  });

  it('restores the artifact and rejects when reading the canvas fails', async () => {
    const failure = new Error('Canvas is tainted');
    vi.mocked(canvas.toDataURL).mockImplementation(() => { throw failure; });

    await expect(downloadImage(artifact, 'Client', 'pdf')).rejects.toBe(failure);

    expect(artifact.className).toBe('artifact');
    expect(savePdf).not.toHaveBeenCalled();
  });

  it.each(['html2canvas', 'jspdf'])('restores the artifact and rejects if %s cannot be imported', async (module) => {
    const failure = new Error('Library download failed');
    vi.doMock(module, () => { throw failure; });

    await expect(downloadImage(artifact, 'Client', 'pdf')).rejects.toMatchObject({ cause: failure });

    expect(artifact.className).toBe('artifact');
    expect(savePdf).not.toHaveBeenCalled();
  });

  it('restores the artifact and rejects when PDF generation fails', async () => {
    const failure = new Error('PDF output failed');
    addImage.mockImplementation(() => { throw failure; });

    await expect(downloadImage(artifact, 'Client', 'pdf')).rejects.toBe(failure);

    expect(artifact.className).toBe('artifact');
    expect(savePdf).not.toHaveBeenCalled();
  });
});
