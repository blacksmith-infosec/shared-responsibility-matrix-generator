import { describe, expect, it } from 'vitest';
import { SYSTEM_TEMPLATES } from '../data/systems';
import { createEmptyState, createSystem, matrixReducer } from './matrix';

describe('matrix state', () => {
  it('creates independent editable copies of template assignments', () => {
    const first = createSystem(1, SYSTEM_TEMPLATES[0]);
    const second = createSystem(2, SYSTEM_TEMPLATES[0]);
    first.assignments.data.push('v');
    expect(second.assignments.data).toEqual(['c', 'm']);
    expect(SYSTEM_TEMPLATES[0].assignments.data).toEqual(['c', 'm']);
  });

  it('starts custom systems with eight unassigned categories', () => {
    expect(createSystem(1)).toMatchObject({
      id: 'sys-1', templateId: null, name: '', vendor: '', expanded: true,
      assignments: { data: [], identity: [], endpoint: [], network: [], app: [], backup: [], logging: [], incident: [] },
    });
  });

  it('adds, edits, toggles and removes systems without mutating earlier state', () => {
    const initial = createEmptyState();
    const added = matrixReducer(initial, { type: 'add', template: SYSTEM_TEMPLATES[0] });
    const edited = matrixReducer(added, { type: 'edit', id: 'sys-1', field: 'name', value: 'Office' });
    const toggled = matrixReducer(edited, { type: 'party', id: 'sys-1', categoryId: 'data', party: 'v' });
    expect(toggled.systems[0].assignments.data).toEqual(['c', 'm', 'v']);
    expect(added.systems[0].name).toBe('Microsoft 365');
    expect(edited.systems[0].assignments.data).toEqual(['c', 'm']);
    const removedParty = matrixReducer(toggled, { type: 'party', id: 'sys-1', categoryId: 'data', party: 'v' });
    expect(removedParty.systems[0].assignments.data).toEqual(['c', 'm']);
    const collapsed = matrixReducer(removedParty, { type: 'expand', id: 'sys-1' });
    expect(collapsed.systems[0].expanded).toBe(false);
    expect(matrixReducer(collapsed, { type: 'remove', id: 'sys-1' }).systems).toEqual([]);
    expect(initial.systems).toEqual([]);
  });

  it('preserves unique ids after removal and clears matrix data on reset', () => {
    let state = matrixReducer(createEmptyState(), { type: 'branding', field: 'customer', value: 'Client' });
    state = matrixReducer(state, { type: 'branding', field: 'msp', value: 'MSP' });
    state = matrixReducer(state, { type: 'add' });
    state = matrixReducer(state, { type: 'remove', id: 'sys-1' });
    state = matrixReducer(state, { type: 'add' });
    expect(state.systems[0].id).toBe('sys-2');
    expect(matrixReducer(state, { type: 'reset' })).toEqual(createEmptyState());
  });
});
