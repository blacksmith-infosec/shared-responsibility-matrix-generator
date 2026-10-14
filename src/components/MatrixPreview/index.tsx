import { Fragment } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { CATEGORIES } from '../../data/categories';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import { PARTIES } from '../../modules/matrix';
import type { MatrixSystem, Party, SystemTemplate } from '../../types/matrix';
import { BrandMark } from '../BrandMark';

interface MatrixPreviewProps {
  customer: string;
  msp: string;
  systems: MatrixSystem[];
  logoDataUrl: string | null;
  onChooseLogo: () => void;
  onAdd: (template?: SystemTemplate) => void;
  artifactRef: RefObject<HTMLDivElement | null>;
}

const QUICKSTART_IDS = ['m365', 'endpoints', 'network', 'backup'];
const QUICKSTART_TEMPLATES = SYSTEM_TEMPLATES.filter((template) => QUICKSTART_IDS.includes(template.id));
const VENDOR_NOTE = 'Vendor platform security and any contracted managed security services. '
  + 'Tenant configuration, user access, data governance, and security settings remain with the client or MSP '
  + 'unless explicitly delegated.';

const MatrixCell = ({ parties }: { parties: Party[] }) => (
  <div className="m-cell">
    {parties.length === 0 ? <span className="na">—</span> : PARTIES.map((party) => (
      <span key={party} className={`dot ${party} ${parties.includes(party) ? 'on' : 'off'}`} />
    ))}
  </div>
);

export const MatrixPreview = ({
  customer, msp, systems, logoDataUrl, onChooseLogo, onAdd, artifactRef,
}: MatrixPreviewProps) => {
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const handleLogoKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onChooseLogo();
  };

  return (
    <div className="artifact-wrap">
      <div className="artifact" id="artifact" ref={artifactRef}>
        <div className="artifact-head">
          <div>
            <h1 className="artifact-title">Shared responsibility matrix</h1>
            <div className="artifact-sub">
              <span id="artifact-customer">{customer || 'Customer name'}</span>
              {' \u00a0·\u00a0 Managed by '}
              <span id="artifact-msp">{msp || 'MSP name'}</span>
              {' \u00a0·\u00a0 '}
              <span id="artifact-date">{dateLabel}</span>
            </div>
          </div>
          {logoDataUrl ? (
            <div className="artifact-logo has-logo" id="artifact-msp-logo">
              <img src={logoDataUrl} alt="MSP logo" />
            </div>
          ) : (
            <div
              className="artifact-logo" id="artifact-msp-logo" role="button" tabIndex={0}
              aria-label="Choose MSP logo" onClick={onChooseLogo} onKeyDown={handleLogoKeyDown}
            >
              <span className="artifact-logo-placeholder">+ MSP<br />LOGO</span>
            </div>
          )}
        </div>
        <div id="artifact-body">
          {systems.length === 0 ? (
            <div className="artifact-empty">
              <BrandMark className="artifact-empty-mark" />
              <h3 className="artifact-empty-title">Start with a template</h3>
              <p className="artifact-empty-copy">
                Each system you add becomes a row in the matrix, showing who handles each security area.
                {' '}Pick one below or use Add system for the full catalog.
              </p>
              <p className="artifact-workflow">
                {'1 · Add systems \u00a0 \u00a0 2 · Set V/M/C \u00a0 \u00a0 3 · Export PNG or PDF'}
              </p>
              <div className="artifact-quickstart">
                {QUICKSTART_TEMPLATES.map((template) => (
                  <button
                    key={template.id} className="artifact-quickstart-btn" data-tpl={template.id}
                    type="button" onClick={() => onAdd(template)}
                  >{template.name}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="matrix" id="matrix" style={{ gridTemplateColumns: `160px repeat(${CATEGORIES.length}, 1fr)` }}>
              <div className="m-hcell" />
              {CATEGORIES.map((category) => (
                <div className="m-hcell" key={category.id}>
                  {category.main}<span className="m-hsub">{category.sub}</span>
                </div>
              ))}
              {systems.map((system) => (
                <Fragment key={system.id}>
                  <div className="m-rlabel">
                    {system.name || 'Untitled system'}
                    {system.vendor && <span className="m-rsub">{system.vendor}</span>}
                  </div>
                  {CATEGORIES.map((category) => (
                    <MatrixCell key={category.id} parties={system.assignments[category.id]} />
                  ))}
                </Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="legend">
          <span className="legend-item" title={VENDOR_NOTE}>
            <svg className="legend-svg" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="5.5" fill="#D97706" />
            </svg>
            <span className="legend-cell-text">Vendor / platform provider</span>
          </span>
          {' '}
          <span className="legend-item">
            <svg className="legend-svg" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="5.5" fill="#44C8F5" />
            </svg>
            <span className="legend-cell-text">MSP</span>
          </span>
          {' '}
          <span className="legend-item">
            <svg className="legend-svg" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="5.5" fill="#16A34A" />
            </svg>
            <span className="legend-cell-text">Client</span>
          </span>
          {' '}
          <span className="legend-item">
            <svg className="legend-svg" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="4.75" fill="none" stroke="#8E8889" strokeWidth="1.5" />
            </svg>
            <span className="legend-cell-text">Not involved</span>
          </span>
          <div className="legend-note">Multiple filled dots indicate shared responsibility.</div>
        </div>
      </div>
    </div>
  );
};
