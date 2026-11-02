import { Fragment, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { CATEGORIES } from '../../data/categories';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import type { CategoryId, CellState, MatrixSystem, Party, ReviewFlag, SystemTemplate } from '../../types/matrix';

interface SystemListProps {
  systems: MatrixSystem[];
  onAdd: (template?: SystemTemplate) => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: 'name' | 'vendor', value: string) => void;
  onToggleExpanded: (id: string) => void;
  onToggleParty: (id: string, categoryId: CategoryId, party: Party) => void;
  onCellState: (id: string, categoryId: CategoryId, state: CellState) => void;
  onResolveVendor: (id: string, categoryId: CategoryId, participates: boolean) => void;
  onScopeNote: (id: string, value: string) => void;
  onReviewed: (id: string) => void;
}

interface SystemCardProps extends Omit<SystemListProps, 'systems' | 'onAdd'> {
  system: MatrixSystem;
}

const PARTIES: { id: Party; label: string }[] = [
  { id: 'v', label: 'Vendor' },
  { id: 'm', label: 'MSP' },
  { id: 'c', label: 'Client' },
];

const STATE_LABELS: Record<CellState, string> = { assigned: 'Assigned', na: 'N/A', unassigned: 'Unassigned' };

const REVIEW_MESSAGES: Record<ReviewFlag, string> = {
  categoriesBroadened: 'Category definitions changed since this matrix was saved. Check Data, Endpoint, Network, and Configuration.',
  monitoringUnconfirmed: 'Monitoring was suggested from the old combined "Logging & response" column. Confirm it and fill in Incident response.',
};

const SystemCard = ({
  system, onRemove, onChange, onToggleExpanded, onToggleParty, onCellState, onResolveVendor, onScopeNote, onReviewed,
}: SystemCardProps) => {
  const systemName = system.name || 'Untitled system';
  /** Shown after a scope edit in this session. Assignments are never changed automatically. */
  const [scopeEdited, setScopeEdited] = useState(false);
  const pendingFlags = (Object.keys(system.reviewFlags) as ReviewFlag[])
    .filter((flag) => system.reviewFlags[flag] === 'pending');

  const handleToggle = () => onToggleExpanded(system.id);
  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleToggle();
  };
  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove(system.id);
  };
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(system.id, 'name', event.target.value);
  };
  const handleVendorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(system.id, 'vendor', event.target.value);
  };

  return (
    <div className={`system-card${system.expanded ? ' expanded' : ''}`} data-id={system.id}>
      <div className="card-head" role="presentation" onClick={handleToggle}>
        <button
          className="card-toggle" type="button" title="Expand/collapse" aria-label="Expand/collapse"
          aria-expanded={system.expanded} aria-controls={`${system.id}-body`} onClick={handleToggleClick}
        >▶</button>
        <div className="card-titles">
          <span className={`card-name-display ${system.name ? '' : 'placeholder'}`}>{systemName}</span>
          <span className="card-vendor-display">{system.vendor}</span>
        </div>
        <button
          className="card-remove" type="button" title="Remove system" aria-label="Remove system" onClick={handleRemove}
        >×</button>
      </div>
      <div className="card-body" id={`${system.id}-body`} hidden={!system.expanded}>
        <div className="card-fields">
          <div className="card-field">
            <label htmlFor={`${system.id}-name`}>System name</label>
            <input
              type="text" id={`${system.id}-name`} className="js-name" value={system.name}
              placeholder="e.g. Microsoft 365" onChange={handleNameChange}
            />
          </div>
          <div className="card-field">
            <label htmlFor={`${system.id}-vendor`}>Vendor</label>
            <input
              type="text" id={`${system.id}-vendor`} className="js-vendor" value={system.vendor}
              placeholder="e.g. Microsoft" onChange={handleVendorChange}
            />
          </div>
          <div className="card-field card-field-wide">
            <label htmlFor={`${system.id}-scope`}>
              Scope note <span className="field-hint">service, workloads, tier, and enabled features</span>
            </label>
            <textarea
              id={`${system.id}-scope`} className="js-scope" rows={3} value={system.scopeNote}
              placeholder="What this row covers and the assumptions behind it"
              onChange={(event) => {
                setScopeEdited(true);
                onScopeNote(system.id, event.target.value);
              }}
            />
            {scopeEdited && (
              <p className="scope-review" role="status">
                Scope changed. Review this row&apos;s assignments; they are not updated automatically.
                {' '}<button className="btn-link js-scope-dismiss" type="button" onClick={() => setScopeEdited(false)}>
                  Dismiss
                </button>
              </p>
            )}
          </div>
        </div>
        {pendingFlags.length > 0 && (
          <div className="review-flags" role="status">
            <ul>
              {pendingFlags.map((flag) => <li key={flag}>{REVIEW_MESSAGES[flag]}</li>)}
            </ul>
            {system.provenance && system.provenance.loggingResponse.length > 0 && (
              <p className="review-provenance">
                Originally saved as Logging &amp; response:
                {' '}{system.provenance.loggingResponse.map((party) => party.toUpperCase()).join(' ')}
              </p>
            )}
            <button type="button" className="btn-thin js-reviewed" onClick={() => onReviewed(system.id)}>
              Mark reviewed
            </button>
          </div>
        )}
        <div className="resp-grid">
          <div className="resp-head label-col">Category</div>
          <div className="resp-head">V</div>
          <div className="resp-head">M</div>
          <div className="resp-head">C</div>
          <div className="resp-head">State</div>
          {CATEGORIES.map((category) => {
            const cell = system.cells[category.id];
            const label = `${category.main} ${category.sub}`;
            return (
              <Fragment key={category.id}>
                <div className="resp-row-label" title={category.definition}>{label}</div>
                {PARTIES.map((party) => {
                  const isSelected = cell.parties.includes(party.id);
                  const isLocked = cell.state === 'na' || (party.id === 'v' && Boolean(cell.vendorUnverified));
                  return (
                    <button
                      key={party.id} type="button" className={`party-toggle ${party.id} ${isSelected ? 'on' : ''}`}
                      data-cat={category.id} data-party={party.id} title={`Toggle ${party.id.toUpperCase()}`}
                      aria-label={`${party.label}: ${label}`} aria-pressed={isSelected} disabled={isLocked}
                      onClick={() => onToggleParty(system.id, category.id, party.id)}
                    />
                  );
                })}
                <select
                  className={`cell-state ${cell.state}`} data-cat={category.id} value={cell.state}
                  aria-label={`State: ${label}`}
                  onChange={(event) => onCellState(system.id, category.id, event.target.value as CellState)}
                >
                  {(Object.keys(STATE_LABELS) as CellState[]).map((option) => (
                    <option key={option} value={option}
                      disabled={(option === 'assigned' && (cell.parties.length === 0 || Boolean(cell.vendorUnverified)))
                        || (option === 'na' && Boolean(cell.vendorUnverified))}
                    >{STATE_LABELS[option]}</option>
                  ))}
                </select>
                {cell.vendorUnverified && (
                  <div className="cell-detail unverified" data-cat={category.id}>
                    <span className="cell-detail-label">Vendor role unverified.</span>
                    {cell.vendorUnverified.note && <span> {cell.vendorUnverified.note}</span>}
                    <span className="cell-detail-actions">
                      <button type="button" className="text-link js-vendor-yes"
                        onClick={() => onResolveVendor(system.id, category.id, true)}>Vendor participates</button>
                      <button type="button" className="text-link js-vendor-no"
                        onClick={() => onResolveVendor(system.id, category.id, false)}>Vendor does not participate</button>
                    </span>
                  </div>
                )}
                {cell.limitedRecovery && (
                  <div className="cell-detail limited" data-cat={category.id}>
                    <span className="cell-detail-label">Limited recovery.</span>
                    {cell.limitedRecovery.note && <span> {cell.limitedRecovery.note}</span>}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SystemList = ({ systems, onAdd, ...cardHandlers }: SystemListProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const usedTemplates = new Set(systems.map((system) => system.templateId));
  const availableTemplates = SYSTEM_TEMPLATES.filter((template) => !usedTemplates.has(template.id));
  let countLabel = '';
  if (systems.length === 1) countLabel = '1 system';
  else if (systems.length > 1) countLabel = `${systems.length} systems`;

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = () => setIsMenuOpen((isOpen) => !isOpen);
  const handleAddCustom = () => {
    onAdd();
    setIsMenuOpen(false);
  };
  const handleAddTemplate = (template: SystemTemplate) => {
    onAdd(template);
    setIsMenuOpen(false);
  };

  return (
    <section className="form-section">
      <h2 className="section-legend">
        <span className="section-title">Systems in scope</span>
        <span className="form-section-count" id="system-count">{countLabel}</span>
      </h2>
      <p className="section-help">
        Add the business systems you&apos;re mapping. Start with a template for sensible defaults, or pick Custom for a blank row.
      </p>
      <div className="add-system-wrap" ref={menuWrapRef}>
        <button
          className={`btn-add-system${isMenuOpen ? ' open' : ''}`} id="add-system-btn" type="button"
          aria-expanded={isMenuOpen} aria-controls="add-menu" onClick={handleToggleMenu}
        >
          <span>+ Add system</span>
          <span className="chev">▼</span>
        </button>
        <div className="add-menu" id="add-menu" hidden={!isMenuOpen}>
          <button className="menu-item" type="button" data-tpl="" onClick={handleAddCustom}>
            <span>Custom (blank)</span>
            {' '}
            <span className="menu-item-sub">build from scratch</span>
          </button>
          {availableTemplates.length > 0 && (
            <>
              <div className="menu-divider" />
              <div className="menu-section-label">From template</div>
              {availableTemplates.map((template) => (
                <button
                  key={template.id} className="menu-item" type="button" data-tpl={template.id}
                  onClick={() => handleAddTemplate(template)}
                >
                  <span>{template.name}</span>
                  {' '}
                  <span className="menu-item-sub">{template.defaultVendor}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="system-list" id="system-list">
        {systems.length > 0 ? systems.map((system) => (
          <SystemCard key={system.id} system={system} {...cardHandlers} />
        )) : (
          <div className="form-empty" id="form-empty">
            No systems yet. Click &quot;Add system&quot; above to start defining the customer environment.
          </div>
        )}
      </div>
    </section>
  );
};
