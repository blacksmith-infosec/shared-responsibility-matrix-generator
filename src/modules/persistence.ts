import { CATEGORIES } from '../data/categories';
import type { MatrixState, Party } from '../types/matrix';
import { createEmptyState, createSystem, PARTIES } from './matrix';

interface SharedSystem {
  n?: string;
  v?: string;
  t?: string | null;
  a?: string[];
}

interface SharedMatrix {
  c?: string;
  m?: string;
  s?: SharedSystem[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

const isSharedMatrix = (value: unknown): value is SharedMatrix => {
  if (!isRecord(value) || !isOptionalString(value.c) || !isOptionalString(value.m)) return false;
  if (value.s === undefined) return true;
  if (!Array.isArray(value.s)) return false;
  return value.s.every((system: unknown) => {
    if (!isRecord(system)) return false;
    if (!isOptionalString(system.n) || !isOptionalString(system.v)) return false;
    if (system.t !== null && !isOptionalString(system.t)) return false;
    return system.a === undefined || (Array.isArray(system.a) && system.a.every(isOptionalString));
  });
};

export const encodeHash = (state: MatrixState): string => {
  const shared: SharedMatrix = {
    c: state.customer,
    m: state.msp,
    s: state.systems.map((system) => ({
      n: system.name,
      v: system.vendor,
      t: system.templateId,
      a: CATEGORIES.map((category) => system.assignments[category.id].join('')),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(shared));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
};

export const decodeHash = (hash: string): MatrixState => {
  if (!hash) return createEmptyState();
  try {
    const bytes = Uint8Array.from(atob(hash), (character) => character.charCodeAt(0));
    const shared: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isSharedMatrix(shared)) return createEmptyState();
    const systems = (shared.s ?? []).map((saved, index) => {
      const system = createSystem(index + 1);
      system.name = saved.n ?? '';
      system.vendor = saved.v ?? '';
      system.templateId = saved.t ?? null;
      system.expanded = false;
      CATEGORIES.forEach((category, categoryIndex) => {
        const codes = saved.a?.[categoryIndex] ?? '';
        system.assignments[category.id] = [...new Set(codes.split(''))]
          .filter((code): code is Party => PARTIES.some((party) => party === code));
      });
      return system;
    });
    return { customer: shared.c ?? '', msp: shared.m ?? '', systems, nextId: systems.length + 1 };
  } catch {
    return createEmptyState();
  }
};

export const saveHash = (state: MatrixState): void => {
  const isEmpty = !state.customer && !state.msp && state.systems.length === 0;
  const hash = isEmpty ? '' : `#${encodeHash(state)}`;
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
};
