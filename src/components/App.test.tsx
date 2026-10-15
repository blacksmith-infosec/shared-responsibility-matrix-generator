import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { downloadCsv, downloadImage } from '../modules/exports';
import { LOGO_KEY } from '../modules/storage';
import App from './App';

vi.mock('../modules/exports', () => ({ downloadCsv: vi.fn(), downloadImage: vi.fn() }));

describe('matrix application', () => {
  it('updates branding and the preview as systems are added, edited and removed', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Client name/), { target: { value: 'Client' } });
    fireEvent.change(screen.getByLabelText(/Prepared by/), { target: { value: 'MSP' } });
    expect(document.getElementById('artifact-customer')).toHaveTextContent('Client');
    expect(document.getElementById('artifact-msp')).toHaveTextContent('MSP');
    fireEvent.click(screen.getByRole('button', { name: 'Microsoft 365' }));
    const card = document.querySelector('.system-card') as HTMLElement;
    fireEvent.change(within(card).getByLabelText('System name'), { target: { value: 'Office' } });
    fireEvent.change(within(card).getByLabelText('Vendor'), { target: { value: 'Vendor' } });
    expect(document.querySelector('.m-rlabel')).toHaveTextContent('Office Vendor');
    fireEvent.click(within(card).getByRole('button', { name: /Vendor.*Data classification/i }));
    expect(document.querySelector('.m-cell .dot.v')).toHaveClass('on');
    fireEvent.click(within(card).getByRole('button', { name: 'Expand/collapse' }));
    expect(card).not.toHaveClass('expanded');
    fireEvent.click(within(card).getByRole('button', { name: /Remove/i }));
    expect(screen.getByText('Start with a template')).toBeVisible();
  });

  it('adds blank systems from the menu and confirms resets', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Add system/ }));
    fireEvent.click(screen.getByRole('button', { name: /Custom \(blank\)/ }));
    expect(screen.getByText('1 system')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Reset everything/ }));
    expect(screen.getByText('1 system')).toBeVisible();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Reset everything/ }));
    expect(screen.getByText('Start with a template')).toBeVisible();
    expect(location.hash).toBe('');
  });

  it('preserves all data when reset is canceled and clears it after confirmation', async () => {
    const savedLogo = 'data:image/png;base64,bG9nbw==';
    localStorage.setItem(LOGO_KEY, savedLogo);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Client name/), { target: { value: 'Client' } });
    fireEvent.change(screen.getByLabelText(/Prepared by/), { target: { value: 'MSP' } });
    fireEvent.click(screen.getByRole('button', { name: 'Microsoft 365' }));
    expect(screen.getAllByRole('img', { name: 'MSP logo' })).toHaveLength(2);
    await waitFor(() => expect(location.hash).not.toBe(''));
    const savedHash = location.hash;

    fireEvent.click(screen.getByRole('button', { name: /Reset everything/ }));
    expect(screen.getByLabelText(/Client name/)).toHaveValue('Client');
    expect(screen.getByLabelText(/Prepared by/)).toHaveValue('MSP');
    expect(screen.getByText('1 system')).toBeVisible();
    expect(screen.getAllByRole('img', { name: 'MSP logo' })).toHaveLength(2);
    expect(localStorage.getItem(LOGO_KEY)).toBe(savedLogo);
    expect(location.hash).toBe(savedHash);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Reset everything/ }));
    expect(screen.getByLabelText(/Client name/)).toHaveValue('');
    expect(screen.getByLabelText(/Prepared by/)).toHaveValue('');
    expect(screen.getByText('Start with a template')).toBeVisible();
    expect(screen.queryAllByRole('img', { name: 'MSP logo' })).toHaveLength(0);
    expect(localStorage.getItem(LOGO_KEY)).toBeNull();
    expect(location.hash).toBe('');
    expect(screen.queryByRole('button', { name: /Reset everything/ })).not.toBeInTheDocument();
  });

  it('allows resetting when a saved logo is the only data', () => {
    localStorage.setItem(LOGO_KEY, 'data:image/png;base64,bG9nbw==');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    expect(screen.getAllByRole('img', { name: 'MSP logo' })).toHaveLength(2);
    const reset = screen.getByRole('button', { name: /Reset everything/ });
    expect(reset).toBeVisible();
    fireEvent.click(reset);
    expect(screen.queryAllByRole('img', { name: 'MSP logo' })).toHaveLength(0);
    expect(localStorage.getItem(LOGO_KEY)).toBeNull();
    expect(reset).not.toBeVisible();
  });

  it.each(['PNG', 'PDF', 'CSV'])('requires a system before %s exports', (format) => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: format }));
    expect(alert).toHaveBeenCalledWith('Add at least one system before exporting.');
    expect(downloadImage).not.toHaveBeenCalled();
  });

  it('downloads CSV and completes image exports', async () => {
    vi.mocked(downloadImage).mockResolvedValue(undefined);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Microsoft 365' }));
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    expect(downloadCsv).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'Microsoft 365' }),
    ]), '');
    fireEvent.click(screen.getByRole('button', { name: 'PNG' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'PNG' })).toBeEnabled());
    expect(downloadImage).toHaveBeenCalledWith(document.getElementById('artifact'), '', 'png');
  });

  it('restores the export controls after a rendering failure', async () => {
    vi.mocked(downloadImage).mockRejectedValue(new Error('Render failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Microsoft 365' }));
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not generate the PDF. See console.'));
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled();
  });
});
