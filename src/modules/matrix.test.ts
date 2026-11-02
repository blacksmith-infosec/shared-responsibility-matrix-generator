import { describe, expect, it } from 'vitest';
import { SYSTEM_TEMPLATES } from '../data/systems';
import type { Cell, SystemTemplate } from '../types/matrix';
import {
  createEmptyState, createSystem, getMatrixStatus, matrixReducer, resolveVendor, setCellState, todayIso, toggleParty,
} from './matrix';

const cell = (overrides: Partial<Cell>): Cell => ({ parties: [], state: 'unassigned', ...overrides });

const template: SystemTemplate = {
  ...SYSTEM_TEMPLATES[0],
  scopeNote: 'Tenant and admin console.',
  cells: {
    ...SYSTEM_TEMPLATES[0].cells,
    backup: { parties: ['v', 'm', 'c'], state: 'assigned', limitedRecovery: { note: 'Recycle bin, 14 days.' } },
    config: { parties: ['m'], state: 'unassigned', vendorUnverified: { note: 'No public patching statement.' } },
    response: { parties: ['c'], state: 'unassigned', note: 'No executor modeled.' },
  },
};

describe('matrix model', () => {
  it('formats local calendar dates', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('starts custom systems with eight unassigned categories and an empty scope note', () => {
    const system = createSystem(1);
    expect(system).toMatchObject({ id: 'sys-1', templateId: null, name: '', vendor: '', scopeNote: '', reviewFlags: {} });
    expect(Object.keys(system.cells)).toEqual(
      ['data', 'identity', 'endpoint', 'network', 'config', 'backup', 'monitoring', 'response'],
    );
    expect(Object.values(system.cells).every((value) => value.state === 'unassigned' && value.parties.length === 0))
      .toBe(true);
  });

  it('copies template cells, qualifiers, and scope notes without sharing references', () => {
    const first = createSystem(1, template);
    const second = createSystem(2, template);
    expect(first.scopeNote).toBe('Tenant and admin console.');
    expect(first.cells.backup.limitedRecovery).toEqual({ note: 'Recycle bin, 14 days.' });
    expect(first.cells.config.vendorUnverified).toEqual({ note: 'No public patching statement.' });
    expect(first.cells.response).toEqual({ parties: ['c'], state: 'unassigned', note: 'No executor modeled.' });
    first.cells.backup.parties.push('m');
    first.cells.backup.limitedRecovery!.note = 'changed';
    expect(second.cells.backup).toEqual(template.cells.backup);
    expect(template.cells.backup.parties).toEqual(['v', 'm', 'c']);
  });
});

describe('cell rules', () => {
  it('toggles parties in canonical order without changing an unassigned state', () => {
    let value = cell({});
    value = toggleParty(value, 'c');
    value = toggleParty(value, 'v');
    expect(value).toEqual({ parties: ['v', 'c'], state: 'unassigned' });
  });

  it('makes an assigned cell unassigned when its last party is removed, never the reverse', () => {
    const value = toggleParty(cell({ parties: ['m'], state: 'assigned' }), 'm');
    expect(value.state).toBe('unassigned');
    expect(toggleParty(value, 'm').state).toBe('unassigned');
  });

  it('ignores party toggles on N/A cells and V toggles while the vendor role is unverified', () => {
    const na = cell({ state: 'na' });
    expect(toggleParty(na, 'm')).toBe(na);
    const unverified = cell({ parties: ['m'], vendorUnverified: { note: 'n' } });
    expect(toggleParty(unverified, 'v')).toBe(unverified);
    expect(toggleParty(unverified, 'c').parties).toEqual(['m', 'c']);
    expect(toggleParty(unverified, 'c').vendorUnverified).toEqual({ note: 'n' });
  });

  it('drops the limited-recovery qualifier with V and keeps it otherwise', () => {
    const backup = cell({ parties: ['v', 'm'], state: 'assigned', limitedRecovery: { note: 'n' } });
    expect(toggleParty(backup, 'm').limitedRecovery).toEqual({ note: 'n' });
    expect(toggleParty(backup, 'v')).toEqual({ parties: ['m'], state: 'assigned' });
  });

  it('allows assigned only with a party and no unverified vendor role', () => {
    const empty = cell({});
    expect(setCellState(empty, 'assigned')).toBe(empty);
    const unverified = cell({ parties: ['m'], vendorUnverified: { note: 'n' } });
    expect(setCellState(unverified, 'assigned')).toBe(unverified);
    expect(setCellState(cell({ parties: ['c'] }), 'assigned')).toEqual({ parties: ['c'], state: 'assigned' });
  });

  it('clears parties and qualifiers for N/A but refuses while the vendor role is unverified', () => {
    expect(setCellState(cell({ parties: ['v'], state: 'assigned', limitedRecovery: { note: 'x' }, note: 'kept' }), 'na'))
      .toEqual({ parties: [], state: 'na', note: 'kept' });
    const unverified = cell({ vendorUnverified: { note: 'n' } });
    expect(setCellState(unverified, 'na')).toBe(unverified);
  });

  it('keeps known parties when a cell is marked unassigned', () => {
    expect(setCellState(cell({ parties: ['c'], state: 'assigned' }), 'unassigned'))
      .toEqual({ parties: ['c'], state: 'unassigned' });
  });

  it('resolves an unverified vendor role only by explicit choice and never completes the cell', () => {
    const plusUOnly = cell({ vendorUnverified: { note: 'n' } });
    expect(resolveVendor(plusUOnly, false)).toEqual({ parties: [], state: 'unassigned' });
    expect(resolveVendor(plusUOnly, true)).toEqual({ parties: ['v'], state: 'unassigned' });
    const known = cell({ parties: ['m'], vendorUnverified: { note: 'n' } });
    expect(resolveVendor(known, true)).toEqual({ parties: ['v', 'm'], state: 'unassigned' });
    const plain = cell({ parties: ['m'], state: 'assigned' });
    expect(resolveVendor(plain, true)).toBe(plain);
  });
});

describe('matrix reducer', () => {
  it('adds, edits, toggles, and removes systems without mutating earlier state', () => {
    const initial = createEmptyState('2026-10-14');
    const added = matrixReducer(initial, { type: 'add', template });
    const edited = matrixReducer(added, { type: 'edit', id: 'sys-1', field: 'scopeNote', value: 'Changed' });
    const toggled = matrixReducer(edited, { type: 'party', id: 'sys-1', categoryId: 'data', party: 'v' });
    expect(toggled.systems[0].cells.data.parties).toContain('v');
    expect(added.systems[0].scopeNote).toBe('Tenant and admin console.');
    expect(added.systems[0].cells.data.parties).not.toContain('v');
    const collapsed = matrixReducer(toggled, { type: 'expand', id: 'sys-1' });
    expect(collapsed.systems[0].expanded).toBe(false);
    expect(matrixReducer(collapsed, { type: 'remove', id: 'sys-1' }).systems).toEqual([]);
    expect(initial.systems).toEqual([]);
  });

  it('routes state and vendor resolution through the cell rules and ignores unchanged cells', () => {
    let state = matrixReducer(createEmptyState(), { type: 'add', template });
    const before = state.systems[0];
    state = matrixReducer(state, { type: 'cellState', id: 'sys-1', categoryId: 'config', state: 'na' });
    expect(state.systems[0]).toBe(before);
    state = matrixReducer(state, { type: 'resolveVendor', id: 'sys-1', categoryId: 'config', participates: false });
    expect(state.systems[0].cells.config).toEqual({ parties: ['m'], state: 'unassigned' });
    state = matrixReducer(state, { type: 'cellState', id: 'sys-1', categoryId: 'response', state: 'assigned' });
    expect(state.systems[0].cells.response.state).toBe('assigned');
  });

  it('marks review flags cleared without touching cells, scope, or the unverified marker', () => {
    let state = matrixReducer(createEmptyState(), { type: 'add', template });
    state = { ...state, systems: [{ ...state.systems[0], reviewFlags: { categoriesBroadened: 'pending' } }] };
    const reviewed = matrixReducer(state, { type: 'reviewed', id: 'sys-1' });
    expect(reviewed.systems[0].reviewFlags).toEqual({ categoriesBroadened: 'cleared' });
    expect(reviewed.systems[0].cells).toBe(state.systems[0].cells);
    expect(reviewed.systems[0].scopeNote).toBe(state.systems[0].scopeNote);
  });

  it('keeps unique ids after removal and resets to a dated empty matrix', () => {
    let state = matrixReducer(createEmptyState(), { type: 'branding', field: 'customer', value: 'Client' });
    state = matrixReducer(state, { type: 'preparedDate', value: '2026-09-01' });
    state = matrixReducer(state, { type: 'add' });
    state = matrixReducer(state, { type: 'remove', id: 'sys-1' });
    state = matrixReducer(state, { type: 'add' });
    expect(state.systems[0].id).toBe('sys-2');
    expect(state.preparedDate).toBe('2026-09-01');
    expect(matrixReducer(state, { type: 'reset', preparedDate: '2026-10-14' })).toEqual(createEmptyState('2026-10-14'));
    const loaded = createEmptyState(null);
    expect(matrixReducer(state, { type: 'load', state: loaded })).toBe(loaded);
  });
});

describe('matrix status', () => {
  it('stays draft for unassigned cells, unverified vendor roles, missing scope, or pending review', () => {
    const complete = createSystem(1, template);
    for (const value of Object.values(complete.cells)) {
      value.state = 'assigned';
      value.parties = value.parties.length ? value.parties : ['m'];
      delete value.vendorUnverified;
    }
    const base = { ...createEmptyState(), systems: [complete] };
    expect(getMatrixStatus(base)).toEqual({ draft: false, unresolvedCells: 0, pendingReviews: 0, missingScope: 0 });
    expect(getMatrixStatus({ ...base, systems: [{ ...complete, scopeNote: '  ' }] }).missingScope).toBe(1);
    expect(getMatrixStatus({ ...base, systems: [{ ...complete, reviewFlags: { categoriesBroadened: 'pending' } }] }))
      .toMatchObject({ draft: true, pendingReviews: 1 });
    expect(getMatrixStatus({ ...base, systems: [{ ...complete, reviewFlags: { categoriesBroadened: 'cleared' } }] }).draft)
      .toBe(false);
    expect(getMatrixStatus({ ...base, systems: [createSystem(2, template)] }).unresolvedCells).toBeGreaterThan(0);
  });
});
