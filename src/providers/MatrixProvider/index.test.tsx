import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as persistence from '../../modules/persistence';
import { MatrixProvider, SAVE_DELAY_MS, useMatrix } from './index';

const legacyHash = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))));

const Editor = () => {
  const { state, dispatch, loadStatus, saveStatus, startNew } = useMatrix();
  return (
    <div>
      <span data-testid="load">{loadStatus.kind}</span>
      <span data-testid="save">{saveStatus}</span>
      <span data-testid="systems">{state.systems.map((system) => system.name).join('|')}</span>
      <span data-testid="date">{state.preparedDate ?? 'none'}</span>
      <input aria-label="Client" value={state.customer}
        onChange={(event) => dispatch({ type: 'branding', field: 'customer', value: event.target.value })} />
      <button type="button" onClick={startNew}>New</button>
    </div>
  );
};

const setHash = (hash: string) => history.replaceState(null, '', `/${hash ? `#${hash}` : ''}`);
const navigate = (hash: string) => {
  setHash(hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => setHash(''));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('saving', () => {
  it('debounces edits, writes a v2 link, and restores it when mounted again', async () => {
    const first = render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    await waitFor(() => expect(location.hash.startsWith('#2.')).toBe(true));
    expect(screen.getByTestId('save')).toHaveTextContent('saved');
    first.unmount();
    render(<MatrixProvider><Editor /></MatrixProvider>);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Client'));
    expect(screen.getByTestId('load')).toHaveTextContent('ok');
  });

  it('waits for the debounce before writing', async () => {
    vi.useFakeTimers();
    render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS - 1));
    expect(location.hash).toBe('');
  });

  it('cancels pending writes after unmount', async () => {
    vi.useFakeTimers();
    const app = render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    app.unmount();
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 2));
    vi.useRealTimers();
    await flush();
    expect(location.hash).toBe('');
  });

  it('dates a new matrix and keeps a v1 link undated', async () => {
    const { unmount } = render(<MatrixProvider><Editor /></MatrixProvider>);
    expect(screen.getByTestId('date')).not.toHaveTextContent('none');
    unmount();
    setHash(legacyHash({ c: 'Old', s: [{ n: 'Mail', a: ['m'] }] }));
    render(<MatrixProvider><Editor /></MatrixProvider>);
    expect(screen.getByTestId('date')).toHaveTextContent('none');
  });

  it('reports a link that is too large to save and leaves the address unchanged', async () => {
    vi.spyOn(persistence, 'encodeHash').mockRejectedValue(new persistence.LinkTooLargeError());
    render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    await waitFor(() => expect(screen.getByTestId('save')).toHaveTextContent('tooLarge'));
    expect(location.hash).toBe('');
  });
});

describe('protected links', () => {
  it.each([['3.future', 'unsupported'], ['2.***', 'malformed'], ['bm90IGpzb24', 'malformed']])(
    'preserves %s, never saves over it, and leaves protection only by starting new', async (hash, kind) => {
      setHash(hash);
      render(<MatrixProvider><Editor /></MatrixProvider>);
      await waitFor(() => expect(screen.getByTestId('load')).toHaveTextContent(kind));
      await new Promise((done) => { setTimeout(done, SAVE_DELAY_MS + 50); });
      expect(location.hash).toBe(`#${hash}`);
      fireEvent.click(screen.getByRole('button', { name: 'New' }));
      expect(screen.getByTestId('load')).toHaveTextContent('ok');
      expect(location.hash).toBe('');
    },
  );

  it('opens v1 links without the compression API', () => {
    vi.stubGlobal('CompressionStream', undefined);
    setHash(legacyHash({ c: 'Old client', s: [{ n: 'Mail', a: ['m'] }] }));
    render(<MatrixProvider><Editor /></MatrixProvider>);
    expect(screen.getByTestId('load')).toHaveTextContent('ok');
    expect(screen.getByRole('textbox')).toHaveValue('Old client');
    vi.unstubAllGlobals();
  });
});

describe('navigation', () => {
  it('keeps an unsupported link intact when navigated to during a pending save', async () => {
    vi.useFakeTimers();
    render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Matrix A' } });
    act(() => navigate('3.future'));
    act(() => vi.advanceTimersByTime(SAVE_DELAY_MS * 3));
    vi.useRealTimers();
    await flush();
    expect(location.hash).toBe('#3.future');
    expect(screen.getByTestId('load')).toHaveTextContent('unsupported');
  });

  it('discards a slow encode of A that finishes after navigating to protected B', async () => {
    const slow = deferred<string>();
    const encode = vi.spyOn(persistence, 'encodeHash').mockReturnValueOnce(slow.promise);
    render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Matrix A' } });
    await waitFor(() => expect(encode).toHaveBeenCalled());
    act(() => navigate('2.***'));
    await waitFor(() => expect(screen.getByTestId('load')).toHaveTextContent('malformed'));
    await act(async () => { slow.resolve('2.stale'); await slow.promise; });
    expect(location.hash).toBe('#2.***');
  });

  const matrixLink = async (customer: string) => {
    const actual = await vi.importActual<typeof persistence>('../../modules/persistence');
    return actual.encodeHash({ customer, msp: '', preparedDate: '2026-10-14', systems: [], nextId: 1 });
  };
  const destinations: [string, () => Promise<string>, string][] = [
    ['a newer-version link', () => Promise.resolve('3.future'), 'unsupported'],
    ['a supported link', () => matrixLink('Matrix B'), 'ok'],
  ];

  it.each(destinations)('never lets an old encode overwrite %s entered before its hashchange arrives', async (
    _label, makeHash, kind,
  ) => {
    const destination = await makeHash();
    setHash(await matrixLink('Matrix A'));
    render(<MatrixProvider><Editor /></MatrixProvider>);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Matrix A'));
    const slow = deferred<string>();
    const encode = vi.spyOn(persistence, 'encodeHash').mockReturnValueOnce(slow.promise);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A edited' } });
    await waitFor(() => expect(encode).toHaveBeenCalled());
    // One task: the browser changes the URL and queues hashchange; A's encode settles before that event runs.
    await act(async () => {
      location.hash = destination;
      slow.resolve('2.stale');
      await slow.promise;
    });
    expect(location.hash).toBe(`#${destination}`);
    await waitFor(() => expect(screen.getByTestId('load')).toHaveTextContent(kind));
    expect(location.hash).toBe(`#${destination}`);
    if (kind === 'ok') expect(screen.getByRole('textbox')).toHaveValue('Matrix B');
  });

  it('applies only the newest of overlapping decodes', async () => {
    const first = deferred<persistence.DecodeResult>();
    const second = deferred<persistence.DecodeResult>();
    const decode = vi.spyOn(persistence, 'decodeHash')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<MatrixProvider><Editor /></MatrixProvider>);
    act(() => navigate('2.first'));
    act(() => navigate('2.second'));
    expect(decode).toHaveBeenCalledTimes(2);
    const make = (name: string): persistence.DecodeResult => ({
      state: { customer: name, msp: '', preparedDate: null, systems: [], nextId: 1 }, status: { kind: 'ok' },
    });
    await act(async () => { second.resolve(make('Second')); await second.promise; });
    await act(async () => { first.resolve(make('First')); await first.promise; });
    expect(screen.getByRole('textbox')).toHaveValue('Second');
  });

  it('moves from supported to unsupported to supported and saves edits normally again', async () => {
    setHash(legacyHash({ c: 'A', s: [{ n: 'Row A', a: ['m'] }] }));
    render(<MatrixProvider><Editor /></MatrixProvider>);
    expect(screen.getByTestId('systems')).toHaveTextContent('Row A');
    act(() => navigate('3.future'));
    expect(screen.getByTestId('load')).toHaveTextContent('unsupported');
    act(() => navigate(legacyHash({ c: 'C', s: [{ n: 'Row C', a: ['v'] }] })));
    expect(screen.getByTestId('load')).toHaveTextContent('ok');
    expect(screen.getByTestId('systems')).toHaveTextContent('Row C');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'C edited' } });
    await waitFor(() => expect(location.hash.startsWith('#2.')).toBe(true));
    const reopened = await persistence.decodeHash(location.hash.slice(1));
    expect(reopened.state.customer).toBe('C edited');
    expect(reopened.state.systems[0].name).toBe('Row C');
  });

  it('follows back and forward between two saved matrices', async () => {
    const hashA = legacyHash({ c: 'A', s: [{ n: 'Row A', a: ['m'] }] });
    const hashB = await persistence.encodeHash({
      customer: 'B', msp: '', preparedDate: '2026-10-01', nextId: 1, systems: [],
    });
    setHash(hashA);
    render(<MatrixProvider><Editor /></MatrixProvider>);
    act(() => navigate(hashB));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('B'));
    act(() => navigate(hashA));
    expect(screen.getByRole('textbox')).toHaveValue('A');
  });
});
