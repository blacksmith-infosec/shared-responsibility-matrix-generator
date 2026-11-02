import { describe, expect, it } from 'vitest';
import { SYSTEM_TEMPLATES } from '../data/systems';
import type { MatrixState } from '../types/matrix';
import { createEmptyState, createSystem, matrixReducer } from './matrix';
import {
  classifyHash, decodeHash, decodeHashSync, encodeHash, isCalendarDate, LinkTooLargeError, MAX_HASH_LENGTH, toV2Matrix,
  writeHash,
} from './persistence';

/** Compresses an arbitrary v2-shaped object directly, bypassing the encoder's own model. */
const rawV2Hash = async (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  const reader = source.pipeThrough(new CompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)
    .getReader();
  let binary = '';
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    for (const byte of chunk.value) binary += String.fromCharCode(byte);
  }
  return `2.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
};

const legacyHash = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))));

let seed = 11;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const randomText = (words: number) => Array.from({ length: words },
  () => Array.from({ length: 3 + Math.floor(random() * 7) }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(random() * 26)])
    .join('')).join(' ');

const fullMatrix = (scopeWords = 80): MatrixState => ({
  ...createEmptyState('2026-10-14'),
  customer: 'Example Medical Group',
  msp: 'Example MSP',
  systems: SYSTEM_TEMPLATES.map((template, index) => ({
    ...createSystem(index + 1, template),
    scopeNote: randomText(scopeWords),
    expanded: false,
  })),
  nextId: SYSTEM_TEMPLATES.length + 1,
});

const withEdits = (): MatrixState => {
  let state = matrixReducer(createEmptyState('2026-10-14'), { type: 'add', template: SYSTEM_TEMPLATES[0] });
  state = matrixReducer(state, { type: 'branding', field: 'customer', value: 'Café 東京' });
  const system = state.systems[0];
  return {
    ...state,
    systems: [{
      ...system,
      scopeNote: 'Tenant and admin console. Sign-in through Entra ID.',
      cells: {
        ...system.cells,
        backup: { parties: ['v', 'm', 'c'], state: 'assigned', limitedRecovery: { note: 'Recycle bin.' } },
        config: { parties: ['m'], state: 'unassigned', vendorUnverified: { note: 'Unverified.' } },
        response: { parties: ['c'], state: 'unassigned', note: 'No executor modeled.' },
        endpoint: { parties: [], state: 'na' },
      },
      reviewFlags: { categoriesBroadened: 'cleared', monitoringUnconfirmed: 'pending' },
      provenance: { loggingResponse: ['v', 'm'] },
      expanded: false,
    }],
  };
};

describe('hash classification', () => {
  it.each([
    ['', { format: 'empty' }],
    ['eyJjIjoiQSJ9', { format: 'v1' }],
    ['2.abc', { format: 'v2', payload: 'abc' }],
    ['3.abc', { format: 'future', version: 3 }],
    ['1.abc', { format: 'malformed' }],
  ])('classifies %s', (hash, expected) => {
    expect(classifyHash(hash)).toEqual(expected);
  });
});

describe('v1 links (read only, frozen map)', () => {
  it('migrates authored names, vendors, template ids, and assignments with review flags and no date', async () => {
    const result = await decodeHash(legacyHash({ c: 'Café 東京', m: 'MSP', s: [{ n: 'Mail', v: 'Microsoft', t: 'm365',
      a: ['cm', 'mv', '', 'v', 'mv', 'm', 'mv'] }] }), '2026-10-14');
    expect(result.status).toEqual({ kind: 'ok' });
    expect(result.state).toMatchObject({ customer: 'Café 東京', msp: 'MSP', preparedDate: null, nextId: 2 });
    const [system] = result.state.systems;
    expect(system).toMatchObject({ id: 'sys-1', name: 'Mail', vendor: 'Microsoft', templateId: 'm365', scopeNote: '',
      expanded: false, reviewFlags: { categoriesBroadened: 'pending', monitoringUnconfirmed: 'pending' },
      provenance: { loggingResponse: ['v', 'm'] } });
    expect(system.cells.data).toEqual({ parties: ['m', 'c'], state: 'assigned' });
    expect(system.cells.endpoint).toEqual({ parties: [], state: 'unassigned' });
    expect(system.cells.config).toEqual({ parties: ['v', 'm'], state: 'assigned' });
    expect(system.cells.monitoring).toEqual({ parties: ['v', 'm'], state: 'unassigned' });
    expect(system.cells.response).toEqual({ parties: [], state: 'unassigned' });
  });

  it('keeps custom rows and does not rebuild from current templates', () => {
    const result = decodeHashSync(legacyHash({ s: [{ n: 'LOB SaaS', v: 'Salesforce', t: 'saas',
      a: ['c', 'mc', '', 'v', 'mc', 'c', 'm'] }, { a: ['vvxm'] }] }), null);
    expect(result?.state.systems[0].cells.config).toEqual({ parties: ['m', 'c'], state: 'assigned' });
    expect(result?.state.systems[1]).toMatchObject({ templateId: null, name: '' });
    expect(result?.state.systems[1].cells.data.parties).toEqual(['v', 'm']);
  });

  it.each(['invalid-base64', legacyHash(null), legacyHash({ c: 42, s: 'bad' }),
    legacyHash({ c: 'Bad', s: [{ a: [42] }] }), legacyHash({ s: [null] })])(
    'reports damaged v1 links as malformed instead of an empty matrix: %s', async (hash) => {
      expect((await decodeHash(hash)).status).toEqual({ kind: 'malformed' });
    },
  );
});

describe('v2 links', () => {
  it('round-trips every cell state, qualifier, note, flag, provenance, scope note, and date', async () => {
    const state = withEdits();
    const hash = await encodeHash(state);
    expect(hash.startsWith('2.')).toBe(true);
    const result = await decodeHash(hash);
    expect(result.status).toEqual({ kind: 'ok' });
    expect(result.state).toEqual(state);
  });

  it('keeps explicitly cleared review flags after reopening', async () => {
    const result = await decodeHash(await encodeHash(withEdits()));
    expect(result.state.systems[0].reviewFlags.categoriesBroadened).toBe('cleared');
  });

  it('migrates a v1 link once and keeps its flags and provenance when re-shared as v2', async () => {
    const migrated = await decodeHash(legacyHash({ s: [{ n: 'Old', a: ['m', '', '', '', '', '', 'vm'] }] }));
    const reopened = await decodeHash(await encodeHash(migrated.state));
    expect(reopened.state).toEqual(migrated.state);
  });

  it('keeps a not-recorded date as null and never substitutes today', async () => {
    const state = { ...withEdits(), preparedDate: null };
    expect((await decodeHash(await encodeHash(state), '2026-10-14')).state.preparedDate).toBeNull();
  });

  it('does not reassign saved rows when a template default changes', async () => {
    const state = withEdits();
    const hash = await encodeHash(state);
    const original = SYSTEM_TEMPLATES[0].cells.data;
    SYSTEM_TEMPLATES[0].cells.data = { parties: ['v'], state: 'assigned' };
    try {
      expect((await decodeHash(hash)).state.systems[0].cells.data).toEqual(state.systems[0].cells.data);
    } finally {
      SYSTEM_TEMPLATES[0].cells.data = original;
    }
  });

  it('serializes by stable category keys', () => {
    expect(Object.keys(toV2Matrix(withEdits()).s[0].a)).toEqual(
      ['data', 'identity', 'endpoint', 'network', 'config', 'backup', 'monitoring', 'response'],
    );
  });

  it('fits a fully noted 23-row matrix within the link budget', async () => {
    const hash = await encodeHash(fullMatrix(80));
    expect(hash.length).toBeLessThan(MAX_HASH_LENGTH / 2);
  });

  it('fits a 23-row matrix with a scope note and a note in every cell within the link cap', async () => {
    const state = fullMatrix(80);
    for (const system of state.systems) {
      for (const cell of Object.values(system.cells)) cell.note = randomText(12);
    }
    const hash = await encodeHash(state);
    expect(hash.length).toBeLessThan(MAX_HASH_LENGTH);
    expect((await decodeHash(hash)).state.systems[22].cells.response.note).toBe(state.systems[22].cells.response.note);
  });

  it('refuses to encode a matrix over the limit rather than truncating notes', async () => {
    await expect(encodeHash(fullMatrix(4000))).rejects.toBeInstanceOf(LinkTooLargeError);
  });

  it('reports a future version as unsupported without decoding it', async () => {
    expect((await decodeHash('3.anything')).status).toEqual({ kind: 'unsupported', version: 3 });
  });

  it.each(['2.***', '2.AAAA', '2.'])('reports damaged v2 data as malformed: %s', async (hash) => {
    expect((await decodeHash(hash)).status).toEqual({ kind: 'malformed' });
  });

  it('rejects structurally valid JSON that breaks the cell rules', async () => {
    const shared = toV2Matrix(withEdits());
    shared.s[0].a.endpoint = { p: 'm', st: 'n' };
    expect((await decodeHash(await rawV2Hash(shared))).status).toEqual({ kind: 'malformed' });
  });

  it('rejects limited recovery outside Backup and keeps it valid in Backup', async () => {
    const shared = toV2Matrix(withEdits());
    shared.s[0].a.data = { p: 'v', st: 'a', L: 'Wrong column' };
    expect((await decodeHash(await rawV2Hash(shared))).status).toEqual({ kind: 'malformed' });
    const valid = toV2Matrix(withEdits());
    valid.s[0].a.backup = { p: 'v', st: 'a', L: '30 days of versions.' };
    const result = await decodeHash(await rawV2Hash(valid));
    expect(result.status).toEqual({ kind: 'ok' });
    expect(result.state.systems[0].cells.backup.limitedRecovery).toEqual({ note: '30 days of versions.' });
  });

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31', '2025-02-29', '1900-02-29'])(
    'rejects an impossible prepared date as malformed: %s',
    async (date) => {
      const shared = { ...toV2Matrix(withEdits()), d: date };
      expect((await decodeHash(await rawV2Hash(shared))).status).toEqual({ kind: 'malformed' });
    },
  );

  it.each(['2024-02-29', '2000-02-29', '0099-12-31'])('keeps a real prepared date unchanged: %s', async (date) => {
    const shared = { ...toV2Matrix(withEdits()), d: date };
    const result = await decodeHash(await rawV2Hash(shared));
    expect(result.status).toEqual({ kind: 'ok' });
    expect(result.state.preparedDate).toBe(date);
  });

  it('keeps isCalendarDate to the YYYY-MM-DD shape', () => {
    expect(isCalendarDate('2026-10-14')).toBe(true);
    expect(isCalendarDate('2026-1-14')).toBe(false);
    expect(isCalendarDate('October 14, 2026')).toBe(false);
  });

  it('rejects oversized links before decoding', async () => {
    expect((await decodeHash(`2.${'A'.repeat(MAX_HASH_LENGTH)}`)).status).toEqual({ kind: 'tooLarge' });
    expect((await decodeHash('A'.repeat(MAX_HASH_LENGTH + 1))).status).toEqual({ kind: 'tooLarge' });
  });

  it('returns a dated empty matrix for an empty hash', async () => {
    expect(await decodeHash('', '2026-10-14')).toEqual({ state: createEmptyState('2026-10-14'), status: { kind: 'ok' } });
  });
});

describe('URL writes', () => {
  it('keeps pathname and query while setting and clearing the hash', () => {
    history.replaceState(null, '', '/tool?campaign=example');
    writeHash('2.abc');
    expect(location.pathname + location.search + location.hash).toBe('/tool?campaign=example#2.abc');
    writeHash('');
    expect(location.href).toContain('/tool?campaign=example');
    expect(location.hash).toBe('');
  });
});
