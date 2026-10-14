import { Fragment, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { CATEGORIES } from '../../data/categories';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import type { CategoryId, MatrixSystem, Party, SystemTemplate } from '../../types/matrix';

interface SystemListProps {
  systems: MatrixSystem[];
  onAdd: (template?: SystemTemplate) => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: 'name' | 'vendor', value: string) => void;
  onToggleExpanded: (id: string) => void;
  onToggleParty: (id: string, categoryId: CategoryId, party: Party) => void;
}

interface SystemCardProps extends Omit<SystemListProps, 'systems' | 'onAdd'> {
  system: MatrixSystem;
}

const PARTIES: { id: Party; label: string }[] = [
  { id: 'v', label: 'Vendor' },
  { id: 'm', label: 'MSP' },
  { id: 'c', label: 'Client' },
];

const SystemCard = ({ system, onRemove, onChange, onToggleExpanded, onToggleParty }: SystemCardProps) => {
  const systemName = system.name || 'Untitled system';

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
        </div>
        <div className="resp-grid">
          <div className="resp-head label-col">Category</div>
          <div className="resp-head">V</div>
          <div className="resp-head">M</div>
          <div className="resp-head">C</div>
          {CATEGORIES.map((category) => (
            <Fragment key={category.id}>
              <div className="resp-row-label">{`${category.main} ${category.sub}`}</div>
              {PARTIES.map((party) => {
                const isSelected = system.assignments[category.id].includes(party.id);
                return (
                  <button
                    key={party.id} type="button" className={`party-toggle ${party.id} ${isSelected ? 'on' : ''}`}
                    data-cat={category.id} data-party={party.id} title={`Toggle ${party.id.toUpperCase()}`}
                    aria-label={`${party.label}: ${category.main} ${category.sub}`} aria-pressed={isSelected}
                    onClick={() => onToggleParty(system.id, category.id, party.id)}
                  />
                );
              })}
            </Fragment>
          ))}
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
