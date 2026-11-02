import { useRef, useState } from 'react';
import { downloadCsv, downloadImage, type ImageFormat } from '../modules/exports';
import { getMatrixStatus } from '../modules/matrix';
import type { LoadStatus } from '../modules/persistence';
import { readLogo, writeLogo } from '../modules/storage';
import { MatrixProvider, useMatrix } from '../providers/MatrixProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import type { CategoryId, CellState, Party, SystemTemplate } from '../types/matrix';
import { Header } from './Header';
import { LogoUpload } from './LogoUpload';
import { MatrixPreview } from './MatrixPreview';
import { SystemList } from './SystemList';

const LOAD_MESSAGES: Record<Exclude<LoadStatus['kind'], 'ok' | 'loading'>, string> = {
  unsupported: 'This link was saved by a newer version of the generator and cannot be opened here.',
  malformed: 'This link could not be read. It may be incomplete or damaged.',
  tooLarge: 'This link is larger than the generator supports.',
  unavailable: 'This browser cannot open compressed matrix links. Try a current version of Chrome, Edge, Firefox, or Safari.',
};

const ProtectedLink = ({ status, onStartNew }: { status: LoadStatus; onStartNew: () => void }) => {
  if (status.kind === 'loading') return <p className="load-status" role="status">Opening saved matrix…</p>;
  if (status.kind === 'ok') return null;
  return (
    <section className="load-error" role="alert">
      <h2 className="load-error-title">Saved matrix not opened</h2>
      <p>{LOAD_MESSAGES[status.kind]}</p>
      <p>The link in your address bar has been left unchanged, and nothing will be saved over it.</p>
      <button className="btn" id="start-new-matrix" type="button" onClick={onStartNew}>Start a new matrix</button>
    </section>
  );
};

const MatrixEditor = () => {
  const { state, dispatch, loadStatus, saveStatus, startNew } = useMatrix();
  const status = getMatrixStatus(state);
  const [logoDataUrl, setLogoDataUrl] = useState(readLogo);
  const [pendingExport, setPendingExport] = useState<ImageFormat | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const artifactRef = useRef<HTMLDivElement>(null);
  const hasResettableData = Boolean(state.customer || state.msp || state.systems.length || logoDataUrl);

  const handleAddSystem = (template?: SystemTemplate) => dispatch({ type: 'add', template });
  const handleRemoveSystem = (id: string) => dispatch({ type: 'remove', id });
  const handleSystemChange = (id: string, field: 'name' | 'vendor', value: string) => (
    dispatch({ type: 'edit', id, field, value })
  );
  const handleToggleExpanded = (id: string) => dispatch({ type: 'expand', id });
  const handleToggleParty = (id: string, categoryId: CategoryId, party: Party) => (
    dispatch({ type: 'party', id, categoryId, party })
  );
  const handleCellState = (id: string, categoryId: CategoryId, cellState: CellState) => (
    dispatch({ type: 'cellState', id, categoryId, state: cellState })
  );
  const handleResolveVendor = (id: string, categoryId: CategoryId, participates: boolean) => (
    dispatch({ type: 'resolveVendor', id, categoryId, participates })
  );
  const handleScopeNote = (id: string, value: string) => dispatch({ type: 'edit', id, field: 'scopeNote', value });
  const handleReviewed = (id: string) => dispatch({ type: 'reviewed', id });

  const handleLogoChange = (logo: string | null) => {
    setLogoDataUrl(logo);
    writeLogo(logo);
  };

  const handleChooseLogo = () => logoInputRef.current?.click();

  const handleExport = async (format: ImageFormat | 'csv') => {
    if (state.systems.length === 0) {
      window.alert('Add at least one system before exporting.');
      return;
    }
    if (pendingExport) return;
    try {
      if (format === 'csv') {
        downloadCsv(state.systems, state.customer);
        return;
      }
      if (!artifactRef.current) return;
      setPendingExport(format);
      await downloadImage(artifactRef.current, state.customer, format);
    } catch (error) {
      console.error(error);
      const exportName = format === 'png' ? 'image' : format.toUpperCase();
      window.alert(`Could not generate the ${exportName}. See console.`);
    } finally {
      setPendingExport(null);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Clear all systems and branding, and reset the URL? This cannot be undone.')) return;
    startNew();
    handleLogoChange(null);
  };

  if (loadStatus.kind !== 'ok') {
    return <>
      <Header />
      <div className="main main-protected">
        <ProtectedLink status={loadStatus} onStartNew={startNew} />
      </div>
    </>;
  }

  return <>
    <Header />
    <div className="main">
      <aside className="form-panel">
        <header className="hero">
          <h1 className="hero-title">Who owns what for <span className="hero-accent">this</span> client
            <span className="brand-dot">.</span>
          </h1>
        </header>
        <section className="form-section">
          <h2 className="section-legend"><span className="section-title">Customer details</span></h2>
          <div className="form-field">
            <label htmlFor="customer">Client name <span className="field-hint">(optional)</span></label>
            <input type="text" id="customer" className="input-underline"
              placeholder="Client or organization name" autoComplete="off" value={state.customer}
              onChange={(event) => dispatch({ type: 'branding', field: 'customer', value: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="msp">Prepared by <span className="field-hint">(optional)</span></label>
            <input type="text" id="msp" className="input-underline" placeholder="Your firm or MSP name"
              autoComplete="off" value={state.msp}
              onChange={(event) => dispatch({ type: 'branding', field: 'msp', value: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="prepared-date">Prepared date <span className="field-hint">(shown on the matrix)</span></label>
            <input type="date" id="prepared-date" className="input-underline" value={state.preparedDate ?? ''}
              onChange={(event) => dispatch({ type: 'preparedDate', value: event.target.value || null })} />
          </div>
          <LogoUpload logoDataUrl={logoDataUrl} onChange={handleLogoChange} inputRef={logoInputRef} />
        </section>
        <SystemList systems={state.systems} onAdd={handleAddSystem} onRemove={handleRemoveSystem}
          onChange={handleSystemChange} onToggleExpanded={handleToggleExpanded} onToggleParty={handleToggleParty}
          onCellState={handleCellState} onResolveVendor={handleResolveVendor} onScopeNote={handleScopeNote}
          onReviewed={handleReviewed} />
        <div className="form-actions">
          <button className="btn-thin" id="reset-all" type="button" hidden={!hasResettableData} onClick={handleReset}>
            ↺ Reset everything
          </button>
        </div>
      </aside>
      <main className="output-panel">
        <div className="output-toolbar">
          <div className="output-toolbar-title">
            Preview
            {state.systems.length > 0 && (
              <span className={`matrix-status${status.draft ? ' draft' : ''}`} id="matrix-status">
                {status.draft ? 'Draft' : 'Assignments complete'}
              </span>
            )}
          </div>
          <div className="output-toolbar-actions">
            <button className="btn btn-secondary" id="download-png" type="button" disabled={Boolean(pendingExport)}
              onClick={() => handleExport('png')}>{pendingExport === 'png' ? '...' : 'PNG'}</button>
            <button className="btn" id="download-pdf" type="button" disabled={Boolean(pendingExport)}
              onClick={() => handleExport('pdf')}>{pendingExport === 'pdf' ? '...' : 'PDF'}</button>
            <button className="btn btn-secondary" id="download-csv" type="button" disabled={Boolean(pendingExport)}
              onClick={() => handleExport('csv')}>CSV</button>
          </div>
        </div>
        <p className="output-disclaimer">
          This is a planning aid. Confirm specific responsibility splits in your managed services agreement before
          treating them as binding.
        </p>
        {saveStatus === 'tooLarge' && (
          <p className="save-warning" role="alert">
            This matrix is too large to save in a link. Recent changes are not in the address bar; shorten scope notes or
            split the matrix.
          </p>
        )}
        {saveStatus === 'failed' && (
          <p className="save-warning" role="alert">Recent changes could not be saved to the link in this browser.</p>
        )}
        <MatrixPreview customer={state.customer} msp={state.msp} preparedDate={state.preparedDate}
          systems={state.systems} logoDataUrl={logoDataUrl}
          onChooseLogo={handleChooseLogo} onAdd={handleAddSystem} artifactRef={artifactRef} />
      </main>
    </div>
  </>;
};

const App = () => <ThemeProvider><MatrixProvider><MatrixEditor /></MatrixProvider></ThemeProvider>;

export default App;
