import type { ChangeEvent, RefObject } from 'react';
import { isLogoDataUrl, MAX_LOGO_BYTES } from '../../modules/storage';

interface LogoUploadProps {
  logoDataUrl: string | null;
  onChange: (logo: string | null) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

const readImageDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    if (typeof dataUrl !== 'string' || !isLogoDataUrl(dataUrl)) {
      reject(new Error('Invalid image data URL'));
      return;
    }
    resolve(dataUrl);
  };
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.readAsDataURL(file);
});

export const LogoUpload = ({ logoDataUrl, onChange, inputRef }: LogoUploadProps) => {
  const handleChooseFile = () => inputRef.current?.click();
  const handleClearLogo = () => onChange(null);
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      window.alert('Logo file is too large. Please use an image under 800KB.');
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      window.alert('Please choose a PNG, JPEG, SVG, or WebP image.');
      return;
    }
    try {
      const dataUrl = await readImageDataUrl(file);
      onChange(dataUrl);
    } catch {
      window.alert('Could not read that file. Try a different image.');
    }
  };

  return (
    <div className="form-field">
      <label htmlFor="logo-file-input">
        MSP logo <span className="field-hint">optional · stored in your browser</span>
      </label>
      <div className="logo-upload" id="logo-upload">
        <div className={`logo-upload-preview${logoDataUrl ? ' has-logo' : ''}`} id="logo-upload-preview">
          {logoDataUrl && <img src={logoDataUrl} alt="MSP logo" />}
        </div>
        <div className="logo-upload-controls">
          <button type="button" className="btn-thin" id="logo-upload-btn" onClick={handleChooseFile}>Choose file…</button>
          <button
            type="button" className="text-link" id="logo-clear-btn" hidden={!logoDataUrl} onClick={handleClearLogo}
          >remove</button>
        </div>
        <input
          type="file" id="logo-file-input" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden
          ref={inputRef} onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
