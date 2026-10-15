import { useRef, useState } from 'react';
import { createEmptyState } from '../modules/matrix';
import { downloadCsv, downloadImage, type ImageFormat } from '../modules/exports';
import { saveHash } from '../modules/persistence';
import { readLogo, writeLogo } from '../modules/storage';
import { MatrixProvider, useMatrix } from '../providers/MatrixProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import type { CategoryId, Party, SystemTemplate } from '../types/matrix';
import { Header } from './Header';
import { LogoUpload } from './LogoUpload';
import { MatrixPreview } from './MatrixPreview';
import { SystemList } from './SystemList';

const MatrixEditor = () => {
  const { state, dispatch } = useMatrix();
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
    dispatch({ type: 'reset' });
    handleLogoChange(null);
    saveHash(createEmptyState());
  };

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
          <LogoUpload logoDataUrl={logoDataUrl} onChange={handleLogoChange} inputRef={logoInputRef} />
        </section>
        <SystemList systems={state.systems} onAdd={handleAddSystem} onRemove={handleRemoveSystem}
          onChange={handleSystemChange} onToggleExpanded={handleToggleExpanded} onToggleParty={handleToggleParty} />
        <div className="form-actions">
          <button className="btn-thin" id="reset-all" type="button" hidden={!hasResettableData} onClick={handleReset}>
            ↺ Reset everything
          </button>
        </div>
      </aside>
      <main className="output-panel">
        <div className="output-toolbar">
          <div className="output-toolbar-title">Preview</div>
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
        <MatrixPreview customer={state.customer} msp={state.msp} systems={state.systems} logoDataUrl={logoDataUrl}
          onChooseLogo={handleChooseLogo} onAdd={handleAddSystem} artifactRef={artifactRef} />
      </main>
    </div>
  </>;
};

const App = () => <ThemeProvider><MatrixProvider><MatrixEditor /></MatrixProvider></ThemeProvider>;

export default App;
