import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogoUpload } from './index';

const setupUpload = (logoDataUrl: string | null = null) => {
  const onChange = vi.fn();
  const inputRef = createRef<HTMLInputElement>();
  const view = render(<LogoUpload logoDataUrl={logoDataUrl} onChange={onChange} inputRef={inputRef} />);
  return { ...view, onChange, input: inputRef.current! };
};

describe('LogoUpload', () => {
  it('opens the file chooser and accepts an image without putting it in the URL', async () => {
    const user = userEvent.setup();
    const { input, onChange } = setupUpload();
    const clickInput = vi.spyOn(input, 'click');
    await user.click(screen.getByRole('button', { name: 'Choose file…' }));
    expect(clickInput).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'remove' })).not.toBeInTheDocument();
    await user.upload(input, new File(['logo'], 'logo.png', { type: 'image/png' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('data:image/png;base64,bG9nbw=='));
    expect(input.value).toBe('');
    expect(location.hash).toBe('');
  });

  it('shows and removes a stored logo', async () => {
    const user = userEvent.setup();
    const { onChange, rerender, input } = setupUpload('data:image/webp;base64,bG9nbw==');
    expect(screen.getByRole('img', { name: 'MSP logo' })).toHaveAttribute('src', 'data:image/webp;base64,bG9nbw==');
    await user.click(screen.getByRole('button', { name: 'remove' }));
    expect(onChange).toHaveBeenCalledWith(null);
    rerender(<LogoUpload logoDataUrl={null} onChange={onChange} inputRef={{ current: input }} />);
    expect(screen.queryByRole('img', { name: 'MSP logo' })).not.toBeInTheDocument();
  });

  it('rejects images above 800KB before reading them', async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const readFile = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    const { input, onChange } = setupUpload();
    const file = new File([new Uint8Array(800 * 1024 + 1)], 'huge.png', { type: 'image/png' });
    await user.upload(input, file);
    expect(alert).toHaveBeenCalledWith('Logo file is too large. Please use an image under 800KB.');
    expect(readFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('rejects unsupported file types before reading them', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const readFile = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    const { input, onChange } = setupUpload();
    fireEvent.change(input, { target: { files: [new File(['html'], 'logo.html', { type: 'text/html' })] } });
    expect(alert).toHaveBeenCalledWith('Please choose a PNG, JPEG, SVG, or WebP image.');
    expect(readFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing if choosing a file is canceled', () => {
    const { input, onChange } = setupUpload();
    fireEvent.change(input, { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports file read failures and leaves the previous logo in place', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      this.dispatchEvent(new ProgressEvent('error'));
    });
    const { input, onChange } = setupUpload('data:image/png;base64,bG9nbw==');
    fireEvent.change(input, { target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not read that file. Try a different image.'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'MSP logo' })).toBeInTheDocument();
  });

  it('rejects a reader result that is not a supported image data URL', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { value: 'data:text/html;base64,aHRtbA==' });
      this.dispatchEvent(new ProgressEvent('load'));
    });
    const { input, onChange } = setupUpload();
    fireEvent.change(input, { target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not read that file. Try a different image.'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
