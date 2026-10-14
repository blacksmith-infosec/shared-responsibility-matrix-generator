import { CATEGORIES } from '../data/categories';
import type { Assignments, CategoryId, MatrixState, MatrixSystem, Party, SystemTemplate } from '../types/matrix';

export const PARTIES: Party[] = ['v', 'm', 'c'];

export type MatrixAction =
  | { type: 'branding'; field: 'customer' | 'msp'; value: string }
  | { type: 'add'; template?: SystemTemplate }
  | { type: 'remove'; id: string }
  | { type: 'edit'; id: string; field: 'name' | 'vendor'; value: string }
  | { type: 'expand'; id: string }
  | { type: 'party'; id: string; categoryId: CategoryId; party: Party }
  | { type: 'reset' };

export const createEmptyState = (): MatrixState => ({ customer: '', msp: '', systems: [], nextId: 1 });

export const createSystem = (id: number, template?: SystemTemplate): MatrixSystem => {
  const assignments = {} as Assignments;
  for (const category of CATEGORIES) {
    assignments[category.id] = [...(template?.assignments[category.id] ?? [])];
  }
  return {
    id: `sys-${id}`,
    templateId: template?.id ?? null,
    name: template?.name ?? '',
    vendor: template?.defaultVendor ?? '',
    assignments,
    expanded: true,
  };
};

export const matrixReducer = (state: MatrixState, action: MatrixAction): MatrixState => {
  switch (action.type) {
    case 'reset':
      return createEmptyState();
    case 'branding':
      return { ...state, [action.field]: action.value };
    case 'add':
      return {
        ...state,
        systems: [...state.systems, createSystem(state.nextId, action.template)],
        nextId: state.nextId + 1,
      };
    case 'remove':
      return { ...state, systems: state.systems.filter((system) => system.id !== action.id) };
    case 'edit':
      return { ...state, systems: state.systems.map((system) => (
        system.id === action.id ? { ...system, [action.field]: action.value } : system
      )) };
    case 'expand':
      return { ...state, systems: state.systems.map((system) => (
        system.id === action.id ? { ...system, expanded: !system.expanded } : system
      )) };
    case 'party':
      return {
        ...state,
        systems: state.systems.map((system) => {
          if (system.id !== action.id) return system;
          const parties = system.assignments[action.categoryId];
          const nextParties = parties.includes(action.party)
            ? parties.filter((party) => party !== action.party)
            : [...parties, action.party];
          return { ...system, assignments: { ...system.assignments, [action.categoryId]: nextParties } };
        }),
      };
  }
};
