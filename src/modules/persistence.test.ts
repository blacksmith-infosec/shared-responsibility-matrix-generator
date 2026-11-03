import { describe, expect, it } from 'vitest';
import { SYSTEM_TEMPLATES } from '../data/systems';
import { createEmptyState, createSystem } from './matrix';
import { decodeHash, encodeHash, saveHash } from './persistence';

const legacyHash = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))));

describe('shared matrix URLs', () => {
  it('preserves saved names and overrides when the catalog changes', () => {
    const hash = legacyHash({ c: 'Client', s: [{ n: 'LOB SaaS', v: 'Salesforce', t: 'saas',
      a: ['c', 'mc', '', 'v', 'mc', 'c', 'm'] }] });
    const restored = decodeHash(hash);
    expect(restored.systems[0]).toMatchObject({ name: 'LOB SaaS', vendor: 'Salesforce', templateId: 'saas' });
    expect(restored.systems[0].assignments).toEqual({
      data: ['c'], identity: ['m', 'c'], endpoint: [], network: ['v'],
      app: ['m', 'c'], backup: ['c'], logging: ['m'], incident: [],
    });
    expect(decodeHash(encodeHash(restored))).toEqual(restored);
  });

  it('opens existing URLs with Unicode branding and legacy party order', () => {
    const hash = legacyHash({ c: 'Café 東京', m: 'MSP', s: [{ n: 'Mail', v: 'Microsoft', t: 'm365',
      a: ['cm', 'mv', '', 'v', 'mv', 'm', 'mv'] }] });
    const restored = decodeHash(hash);
    expect(restored.customer).toBe('Café 東京');
    expect(restored.systems[0]).toMatchObject({
      id: 'sys-1', name: 'Mail', vendor: 'Microsoft', templateId: 'm365', expanded: false,
    });
    expect(restored.systems[0].assignments.data).toEqual(['c', 'm']);
    expect(restored.nextId).toBe(2);
  });

  it('round-trips current matrices without including expansion or logos', () => {
    const state = { ...createEmptyState(), customer: 'Café 東京', msp: 'Our MSP',
      systems: [createSystem(1, SYSTEM_TEMPLATES[0])], nextId: 2 };
    const hash = encodeHash(state);
    const restored = decodeHash(hash);
    expect(restored).toEqual({ ...state, systems: [{ ...state.systems[0], expanded: false }] });
    expect(JSON.parse(decodeURIComponent(escape(atob(hash))))).toEqual({
      c: 'Café 東京', m: 'Our MSP', s: [{ n: 'Microsoft 365', v: 'Microsoft', t: 'm365',
        a: ['vmc', 'mc', '', 'vm', 'mv', 'vmc', 'mv', 'mc'] }],
    });
  });

  it('preserves incident response overrides through shared URLs', () => {
    const system = createSystem(1, SYSTEM_TEMPLATES[0]);
    system.assignments.incident = ['v', 'c'];
    const state = { ...createEmptyState(), systems: [system], nextId: 2 };
    expect(decodeHash(encodeHash(state)).systems[0].assignments.incident).toEqual(['v', 'c']);
  });

  it.each(['', 'invalid-base64', legacyHash(null), legacyHash({ c: 42, s: 'bad' }),
    legacyHash({ c: 'Bad', s: [{ a: [42] }] }), legacyHash({ s: [null] })])(
    'ignores invalid input atomically: %s', (hash) => {
      expect(decodeHash(hash)).toEqual(createEmptyState());
    },
  );

  it('accepts absent optional fields and removes unrecognized party codes', () => {
    const restored = decodeHash(legacyHash({ s: [{ a: ['vvxm'] }] }));
    expect(restored.systems[0].assignments.data).toEqual(['v', 'm']);
    expect(restored.systems[0].assignments.identity).toEqual([]);
    expect(restored.systems[0].name).toBe('');
  });

  it('keeps pathname and query while saving and clearing the hash', () => {
    history.replaceState(null, '', '/tool?campaign=example');
    saveHash({ ...createEmptyState(), customer: 'Client' });
    expect(location.pathname + location.search).toBe('/tool?campaign=example');
    expect(decodeHash(location.hash.slice(1)).customer).toBe('Client');
    saveHash(createEmptyState());
    expect(location.href).toContain('/tool?campaign=example');
    expect(location.hash).toBe('');
  });
});
