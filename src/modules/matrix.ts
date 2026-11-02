import { CATEGORIES } from '../data/categories';
import type {
  Cell, Cells, CategoryId, CellState, MatrixState, MatrixSystem, Party, ReviewFlag, SystemTemplate,
} from '../types/matrix';

export const PARTIES: Party[] = ['v', 'm', 'c'];

export type MatrixAction =
  | { type: 'branding'; field: 'customer' | 'msp'; value: string }
  | { type: 'preparedDate'; value: string | null }
  | { type: 'add'; template?: SystemTemplate }
  | { type: 'remove'; id: string }
  | { type: 'edit'; id: string; field: 'name' | 'vendor' | 'scopeNote'; value: string }
  | { type: 'expand'; id: string }
  | { type: 'party'; id: string; categoryId: CategoryId; party: Party }
  | { type: 'cellState'; id: string; categoryId: CategoryId; state: CellState }
  | { type: 'resolveVendor'; id: string; categoryId: CategoryId; participates: boolean }
  | { type: 'reviewed'; id: string }
  | { type: 'load'; state: MatrixState }
  | { type: 'reset'; preparedDate: string | null };

/** Local calendar date as YYYY-MM-DD. */
export const todayIso = (now = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const createEmptyState = (preparedDate: string | null = null): MatrixState => (
  { customer: '', msp: '', preparedDate, systems: [], nextId: 1 }
);

export const sortParties = (parties: readonly Party[]): Party[] => PARTIES.filter((party) => parties.includes(party));

export const copyCell = (cell: Cell): Cell => ({
  parties: [...cell.parties],
  state: cell.state,
  ...(cell.limitedRecovery ? { limitedRecovery: { ...cell.limitedRecovery } } : {}),
  ...(cell.vendorUnverified ? { vendorUnverified: { ...cell.vendorUnverified } } : {}),
  ...(cell.note !== undefined ? { note: cell.note } : {}),
});

const unassignedCell = (): Cell => ({ parties: [], state: 'unassigned' });

export const createSystem = (id: number, template?: SystemTemplate): MatrixSystem => {
  const cells = {} as Cells;
  for (const category of CATEGORIES) {
    const source = template?.cells[category.id];
    cells[category.id] = source ? copyCell(source) : unassignedCell();
  }
  return {
    id: `sys-${id}`,
    templateId: template?.id ?? null,
    name: template?.name ?? '',
    vendor: template?.defaultVendor ?? '',
    scopeNote: template?.scopeNote ?? '',
    cells,
    reviewFlags: {},
    expanded: true,
  };
};

/**
 * Apply the cell rules. Returns the same cell when an action is not allowed.
 * - assigned needs a party and no unresolved vendor marker; na has no parties or qualifiers;
 *   unassigned may keep known parties.
 * - Party toggles never resolve a cell. Removing the last party of an assigned cell makes it unassigned.
 * - V cannot be toggled while the vendor role is unverified: resolve it explicitly.
 * - Removing V removes the limited-recovery qualifier, which only describes a vendor contribution.
 */
export const toggleParty = (cell: Cell, party: Party): Cell => {
  if (cell.state === 'na') return cell;
  if (party === 'v' && cell.vendorUnverified) return cell;
  const has = cell.parties.includes(party);
  const parties = has ? cell.parties.filter((candidate) => candidate !== party) : sortParties([...cell.parties, party]);
  const next: Cell = { ...cell, parties };
  if (party === 'v' && has) delete next.limitedRecovery;
  if (next.state === 'assigned' && parties.length === 0) next.state = 'unassigned';
  return next;
};

export const setCellState = (cell: Cell, state: CellState): Cell => {
  if (cell.state === state) return cell;
  if (state === 'assigned') {
    if (cell.parties.length === 0 || cell.vendorUnverified) return cell;
    return { ...cell, state };
  }
  if (state === 'na') {
    if (cell.vendorUnverified) return cell;
    const next: Cell = { parties: [], state: 'na' };
    if (cell.note !== undefined) next.note = cell.note;
    return next;
  }
  return { ...cell, state };
};

export const resolveVendor = (cell: Cell, participates: boolean): Cell => {
  if (!cell.vendorUnverified) return cell;
  const next: Cell = { ...cell, parties: participates ? sortParties([...cell.parties, 'v']) : [...cell.parties] };
  delete next.vendorUnverified;
  return next;
};

const markReviewed = (system: MatrixSystem): MatrixSystem => {
  const reviewFlags = { ...system.reviewFlags };
  for (const flag of Object.keys(reviewFlags) as ReviewFlag[]) {
    if (reviewFlags[flag] === 'pending') reviewFlags[flag] = 'cleared';
  }
  return { ...system, reviewFlags };
};

const updateSystem = (state: MatrixState, id: string, update: (system: MatrixSystem) => MatrixSystem): MatrixState => ({
  ...state,
  systems: state.systems.map((system) => (system.id === id ? update(system) : system)),
});

const updateCell = (system: MatrixSystem, categoryId: CategoryId, update: (cell: Cell) => Cell): MatrixSystem => {
  const current = system.cells[categoryId];
  const next = update(current);
  return next === current ? system : { ...system, cells: { ...system.cells, [categoryId]: next } };
};

export const matrixReducer = (state: MatrixState, action: MatrixAction): MatrixState => {
  switch (action.type) {
    case 'reset':
      return createEmptyState(action.preparedDate);
    case 'load':
      return action.state;
    case 'branding':
      return { ...state, [action.field]: action.value };
    case 'preparedDate':
      return { ...state, preparedDate: action.value };
    case 'add':
      return {
        ...state,
        systems: [...state.systems, createSystem(state.nextId, action.template)],
        nextId: state.nextId + 1,
      };
    case 'remove':
      return { ...state, systems: state.systems.filter((system) => system.id !== action.id) };
    case 'edit':
      return updateSystem(state, action.id, (system) => ({ ...system, [action.field]: action.value }));
    case 'expand':
      return updateSystem(state, action.id, (system) => ({ ...system, expanded: !system.expanded }));
    case 'party':
      return updateSystem(state, action.id,
        (system) => updateCell(system, action.categoryId, (cell) => toggleParty(cell, action.party)));
    case 'cellState':
      return updateSystem(state, action.id,
        (system) => updateCell(system, action.categoryId, (cell) => setCellState(cell, action.state)));
    case 'resolveVendor':
      return updateSystem(state, action.id,
        (system) => updateCell(system, action.categoryId, (cell) => resolveVendor(cell, action.participates)));
    case 'reviewed':
      return updateSystem(state, action.id, markReviewed);
  }
};

export interface MatrixStatus {
  draft: boolean;
  unresolvedCells: number;
  pendingReviews: number;
  missingScope: number;
}

/** Draft while any cell is unassigned or has an unverified vendor role, any row lacks a scope note, or a review is pending. */
export const getMatrixStatus = (state: MatrixState): MatrixStatus => {
  let unresolvedCells = 0;
  let pendingReviews = 0;
  let missingScope = 0;
  for (const system of state.systems) {
    if (system.scopeNote.trim() === '') missingScope += 1;
    if (Object.values(system.reviewFlags).includes('pending')) pendingReviews += 1;
    for (const category of CATEGORIES) {
      const cell = system.cells[category.id];
      if (cell.state === 'unassigned' || cell.vendorUnverified) unresolvedCells += 1;
    }
  }
  return {
    draft: unresolvedCells + pendingReviews + missingScope > 0,
    unresolvedCells,
    pendingReviews,
    missingScope,
  };
};
