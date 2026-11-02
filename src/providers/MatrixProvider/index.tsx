import {
  createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode,
} from 'react';
import { createEmptyState, matrixReducer, todayIso, type MatrixAction } from '../../modules/matrix';
import {
  decodeHash, decodeHashSync, encodeHash, isEmptyMatrix, LinkTooLargeError, writeHash, type DecodeResult, type LoadStatus,
} from '../../modules/persistence';
import type { MatrixState } from '../../types/matrix';

export const SAVE_DELAY_MS = 400;

export type SaveStatus = 'idle' | 'saved' | 'tooLarge' | 'failed';

interface MatrixContextValue {
  state: MatrixState;
  dispatch: Dispatch<MatrixAction>;
  /** Whether the current link could be loaded. Anything but "ok" disables saving and preserves the URL. */
  loadStatus: LoadStatus;
  saveStatus: SaveStatus;
  /** Start a new matrix: leaves any protected state and clears the link. */
  startNew: () => void;
}

const MatrixContext = createContext<MatrixContextValue | null>(null);

const currentHash = () => location.hash.slice(1);

const initialLoad = () => {
  const result = decodeHashSync(currentHash(), todayIso());
  return result ?? { state: createEmptyState(), status: { kind: 'loading' } as LoadStatus };
};

export const MatrixProvider = ({ children }: { children: ReactNode }) => {
  const [initial] = useState(initialLoad);
  const [state, dispatch] = useReducer(matrixReducer, initial.state);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(initial.status);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  /** Incremented on every navigation or new matrix: any older load or save result is discarded. */
  const navigation = useRef(0);
  /** Incremented on every scheduled save: only the newest save may write the URL. */
  const saveSequence = useRef(0);
  /** Skip re-encoding a state that was just loaded from (or cleared to) the current link. */
  const skipNextSave = useRef(initial.status.kind !== 'ok' || currentHash() !== '');
  /**
   * The link this provider last loaded or wrote. A save may write only while the address bar still shows it, so a
   * link entered before its hashchange event arrives is never overwritten.
   */
  const ownedHash = useRef(currentHash());

  const apply = useCallback((generation: number, result: DecodeResult) => {
    if (generation !== navigation.current) return;
    if (result.status.kind === 'ok') {
      skipNextSave.current = true;
      dispatch({ type: 'load', state: result.state });
    }
    setLoadStatus(result.status);
  }, []);

  /** Begin a new navigation: any pending save or older load result is discarded. */
  const beginNavigation = () => {
    saveSequence.current += 1;
    return ++navigation.current;
  };

  const load = useCallback((hash: string) => {
    const generation = beginNavigation();
    ownedHash.current = hash;
    const immediate = decodeHashSync(hash, todayIso());
    if (immediate) {
      apply(generation, immediate);
      return;
    }
    setLoadStatus({ kind: 'loading' });
    void decodeHash(hash, todayIso()).then((result) => apply(generation, result));
  }, [apply]);

  useEffect(() => {
    if (initial.status.kind === 'loading') {
      const generation = beginNavigation();
      void decodeHash(currentHash(), todayIso()).then((result) => apply(generation, result));
    }
    const handleHashChange = () => load(currentHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      navigation.current += 1;
      saveSequence.current += 1;
    };
  }, [initial.status.kind, load, apply]);

  useEffect(() => {
    if (loadStatus.kind !== 'ok') return undefined;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    const generation = navigation.current;
    const sequence = ++saveSequence.current;
    const owned = ownedHash.current;
    const isCurrent = () => (
      generation === navigation.current && sequence === saveSequence.current && currentHash() === owned
    );
    const save = (hash: string) => {
      writeHash(hash);
      ownedHash.current = hash;
      setSaveStatus('saved');
    };
    const timer = window.setTimeout(() => {
      if (!isCurrent()) return;
      if (isEmptyMatrix(state)) {
        save('');
        return;
      }
      encodeHash(state).then((hash) => {
        if (!isCurrent()) return;
        save(hash);
      }, (error: unknown) => {
        if (!isCurrent()) return;
        setSaveStatus(error instanceof LinkTooLargeError ? 'tooLarge' : 'failed');
      });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, loadStatus.kind]);

  const startNew = useCallback(() => {
    beginNavigation();
    skipNextSave.current = true;
    writeHash('');
    ownedHash.current = '';
    dispatch({ type: 'reset', preparedDate: todayIso() });
    setLoadStatus({ kind: 'ok' });
    setSaveStatus('idle');
  }, []);

  return (
    <MatrixContext.Provider value={{ state, dispatch, loadStatus, saveStatus, startNew }}>
      {children}
    </MatrixContext.Provider>
  );
};

export const useMatrix = (): MatrixContextValue => {
  const context = useContext(MatrixContext);
  if (!context) throw new Error('useMatrix must be used within MatrixProvider.');
  return context;
};
