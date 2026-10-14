import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { matrixReducer, type MatrixAction } from '../../modules/matrix';
import { decodeHash, saveHash } from '../../modules/persistence';
import type { MatrixState } from '../../types/matrix';

interface MatrixContextValue {
  state: MatrixState;
  dispatch: Dispatch<MatrixAction>;
}

const MatrixContext = createContext<MatrixContextValue | null>(null);

export const MatrixProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(matrixReducer, undefined, () => decodeHash(location.hash.slice(1)));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        saveHash(state);
      } catch (error) {
        console.error('Save to hash failed:', error);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);

  return <MatrixContext.Provider value={{ state, dispatch }}>{children}</MatrixContext.Provider>;
};

export const useMatrix = (): MatrixContextValue => {
  const context = useContext(MatrixContext);
  if (!context) throw new Error('useMatrix must be used within MatrixProvider.');
  return context;
};
