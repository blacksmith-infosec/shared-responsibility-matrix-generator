import { describe, expect, it, vi } from 'vitest';
import { isLogoDataUrl, LOGO_KEY, readLogo, writeLogo } from './storage';

describe('local logo storage', () => {
  it('loads and removes supported image data URLs', () => {
    const logo = 'data:image/png;base64,aGVsbG8=';
    writeLogo(logo);
    expect(localStorage.getItem(LOGO_KEY)).toBe(logo);
    expect(readLogo()).toBe(logo);
    writeLogo(null);
    expect(readLogo()).toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:text/html;base64,aGVsbG8=', 'data:image/png;bad',
    'data:image/png;base64,aGVsbG8=" onerror="alert(1)'])('rejects invalid images: %s', (value) => {
    localStorage.setItem(LOGO_KEY, value);
    expect(isLogoDataUrl(value)).toBe(false);
    expect(readLogo()).toBeNull();
  });

  it('continues when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(readLogo()).toBeNull();
    expect(() => writeLogo('data:image/png;base64,aGVsbG8=')).not.toThrow();
    expect(() => writeLogo(null)).not.toThrow();
  });
});
