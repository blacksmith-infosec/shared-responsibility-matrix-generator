export const THEME_KEY = 'blacksmith-srm-theme';
export const LOGO_KEY = 'blacksmith-srm-msp-logo';
export const MAX_LOGO_BYTES = 800 * 1024;

export const isLogoDataUrl = (value: string): boolean => (
  /^data:image\/(?:png|jpeg|svg\+xml|webp);base64,[a-z\d+/]+=*$/i.test(value)
);

export const readLogo = (): string | null => {
  try {
    const logo = localStorage.getItem(LOGO_KEY);
    return logo && isLogoDataUrl(logo) ? logo : null;
  } catch {
    // Browser privacy settings can disable persistence without preventing editing.
    return null;
  }
};

export const writeLogo = (logo: string | null): void => {
  try {
    if (logo) localStorage.setItem(LOGO_KEY, logo);
    else localStorage.removeItem(LOGO_KEY);
  } catch {
    // Keep the in-memory logo usable when storage is unavailable or full.
  }
};
