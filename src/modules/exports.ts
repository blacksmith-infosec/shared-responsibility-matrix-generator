import { CATEGORIES } from '../data/categories';
import type { MatrixSystem } from '../types/matrix';
import { PARTIES } from './matrix';

export type ImageFormat = 'png' | 'pdf';

export const createFilename = (customer: string, extension: string): string => {
  const slug = customer.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'matrix';
  return `srm-${slug}.${extension}`;
};

const escapeCsvCell = (value: string): string => {
  // Spreadsheet programs can also recognize full-width formula prefixes in some locales.
  const text = /^[\t\r\n]|^\s*[=+\-@＝＋－＠]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const createCsv = (systems: MatrixSystem[]): string => {
  const headers = ['System', 'Vendor', ...CATEGORIES.map((category) => `${category.main} ${category.sub}`.trim())];
  const rows = systems.map((system) => [
    system.name,
    system.vendor,
    ...CATEGORIES.map((category) => PARTIES
      .filter((party) => system.assignments[category.id].includes(party)).join('').toUpperCase()),
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
};

const downloadLink = (href: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
};

export const downloadCsv = (systems: MatrixSystem[], customer: string): void => {
  const blob = new Blob([createCsv(systems)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  try {
    downloadLink(url, createFilename(customer, 'csv'));
  } finally {
    URL.revokeObjectURL(url);
  }
};

const prepareImageCapture = (_document: Document, artifact: HTMLElement): void => {
  // Render the complete matrix without changing the editor's size or scroll position.
  artifact.style.width = '920px';
  const matrixScroll = artifact.querySelector<HTMLElement>('.matrix-scroll');
  if (!matrixScroll) return;
  matrixScroll.style.overflow = 'visible';
  matrixScroll.scrollLeft = 0;
};

export const downloadImage = async (artifact: HTMLElement, customer: string, format: ImageFormat): Promise<void> => {
  artifact.classList.add('is-exporting');
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(artifact, {
      backgroundColor: '#FFFFFF', scale: 2, logging: false, useCORS: true,
      onclone: prepareImageCapture,
    });
    const image = canvas.toDataURL('image/png');
    if (format === 'png') {
      downloadLink(image, createFilename(customer, 'png'));
      return;
    }
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
    const width = canvas.width * scale;
    const height = canvas.height * scale;
    pdf.addImage(image, 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
    pdf.save(createFilename(customer, 'pdf'));
  } finally {
    artifact.classList.remove('is-exporting');
  }
};
