import { useTheme } from '../../providers/ThemeProvider';
import { BrandMark } from '../BrandMark';

export const Header = () => {
  const { toggleTheme } = useTheme();

  return (
    <nav className="nav" aria-label="Main navigation">
      <a className="brand" href="https://blacksmithinfosec.com" target="_blank" rel="noopener noreferrer">
        <BrandMark className="brand-mark" />
        <span className="brand-text">
          <span className="brand-name">Blacksmith<span className="brand-dot">.</span></span>
          <span className="brand-sub">Shared Responsibility Matrix</span>
        </span>
      </a>
      <div className="nav-right">
        <nav className="header-nav" aria-label="External links">
          <a
            href="https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a href="https://blacksmithinfosec.com" target="_blank" rel="noopener noreferrer">Blacksmith</a>
        </nav>
        <button className="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle theme" onClick={toggleTheme}>
          <svg
            className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg
            className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </nav>
  );
};
