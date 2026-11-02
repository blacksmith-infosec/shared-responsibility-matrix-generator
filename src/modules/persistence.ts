import { CATEGORIES } from '../data/categories';
import type {
  Cell, CategoryId, CellState, LegacyProvenance, MatrixState, MatrixSystem, Party, ReviewFlags,
} from '../types/matrix';
import { migrateV1Row, parseV1Parties, V1_POSITION_COUNT } from './legacy';
import { createEmptyState, createSystem, sortParties } from './matrix';

/** Upper bounds for saved links. Oversized links fail visibly; notes are never truncated to fit. */
export const MAX_HASH_LENGTH = 24_000;
export const MAX_JSON_BYTES = 256_000;
export const CURRENT_VERSION = 2;

export type LoadStatus =
  | { kind: 'ok' }
  | { kind: 'loading' }
  | { kind: 'unsupported'; version: number }
  | { kind: 'malformed' }
  | { kind: 'tooLarge' }
  | { kind: 'unavailable' };

export interface DecodeResult {
  state: MatrixState;
  status: LoadStatus;
}

export type HashFormat =
  | { format: 'empty' }
  | { format: 'v1' }
  | { format: 'v2'; payload: string }
  | { format: 'future'; version: number }
  | { format: 'malformed' };

export class LinkTooLargeError extends Error {
  constructor() {
    super('Saved link exceeds the supported size.');
    this.name = 'LinkTooLargeError';
  }
}

/** v1 links are plain base64 (no dot). Versioned links start with "<number>.". */
export const classifyHash = (hash: string): HashFormat => {
  if (!hash) return { format: 'empty' };
  const match = /^(\d{1,4})\.([\s\S]*)$/.exec(hash);
  if (!match) return { format: 'v1' };
  const version = Number(match[1]);
  if (version === CURRENT_VERSION) return { format: 'v2', payload: match[2] };
  if (version > CURRENT_VERSION) return { format: 'future', version };
  return { format: 'malformed' };
};

export const isCompressionAvailable = (): boolean => (
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);
const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

const failed = (status: LoadStatus): DecodeResult => ({ state: createEmptyState(), status });

/* ---------------------------------------------------------------- v1 (read only) */

interface V1System { n?: string; v?: string; t?: string | null; a?: string[] }
interface V1Matrix { c?: string; m?: string; s?: V1System[] }

const isV1Matrix = (value: unknown): value is V1Matrix => {
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

export const decodeV1 = (hash: string): DecodeResult => {
  try {
    if (hash.length > MAX_HASH_LENGTH) return failed({ kind: 'tooLarge' });
    const bytes = Uint8Array.from(atob(hash), (character) => character.charCodeAt(0));
    const shared: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isV1Matrix(shared)) return failed({ kind: 'malformed' });
    const systems = (shared.s ?? []).map((saved, index): MatrixSystem => {
      const migrated = migrateV1Row((saved.a ?? []).slice(0, V1_POSITION_COUNT));
      return {
        ...createSystem(index + 1),
        templateId: saved.t ?? null,
        name: saved.n ?? '',
        vendor: saved.v ?? '',
        scopeNote: '',
        cells: migrated.cells,
        reviewFlags: migrated.reviewFlags,
        provenance: migrated.provenance,
        expanded: false,
      };
    });
    return {
      state: { customer: shared.c ?? '', msp: shared.m ?? '', preparedDate: null, systems, nextId: systems.length + 1 },
      status: { kind: 'ok' },
    };
  } catch {
    return failed({ kind: 'malformed' });
  }
};

/* ---------------------------------------------------------------- v2 */

type StateCode = 'a' | 'n' | 'u';
const STATE_TO_CODE: Record<CellState, StateCode> = { assigned: 'a', na: 'n', unassigned: 'u' };
const CODE_TO_STATE: Record<StateCode, CellState> = { a: 'assigned', n: 'na', u: 'unassigned' };

interface V2Cell { p: string; st: StateCode; L?: string; U?: string; nt?: string }
interface V2System {
  t: string | null;
  n: string;
  vd: string;
  sn: string;
  rf?: ReviewFlags;
  pv?: { lr: string };
  a: Record<CategoryId, V2Cell>;
}
interface V2Matrix { v: 2; c: string; m: string; d: string | null; s: V2System[] }

const toV2Cell = (cell: Cell): V2Cell => ({
  p: cell.parties.join(''),
  st: STATE_TO_CODE[cell.state],
  ...(cell.limitedRecovery ? { L: cell.limitedRecovery.note } : {}),
  ...(cell.vendorUnverified ? { U: cell.vendorUnverified.note } : {}),
  ...(cell.note !== undefined ? { nt: cell.note } : {}),
});

export const toV2Matrix = (state: MatrixState): V2Matrix => ({
  v: 2,
  c: state.customer,
  m: state.msp,
  d: state.preparedDate,
  s: state.systems.map((system) => {
    const cells = {} as Record<CategoryId, V2Cell>;
    for (const category of CATEGORIES) cells[category.id] = toV2Cell(system.cells[category.id]);
    return {
      t: system.templateId,
      n: system.name,
      vd: system.vendor,
      sn: system.scopeNote,
      ...(Object.keys(system.reviewFlags).length > 0 ? { rf: { ...system.reviewFlags } } : {}),
      ...(system.provenance ? { pv: { lr: system.provenance.loggingResponse.join('') } } : {}),
      a: cells,
    };
  }),
});

const PARTY_CODES = /^(?!.*(.).*\1)[vmc]*$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in YYYY-MM-DD form (no month 13, no February 31). */
export const isCalendarDate = (value: string): boolean => {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= days;
};
const FLAG_KEYS = new Set(['categoriesBroadened', 'monitoringUnconfirmed']);

const isV2Cell = (categoryId: CategoryId, value: unknown): value is V2Cell => {
  if (!isRecord(value) || typeof value.p !== 'string' || !PARTY_CODES.test(value.p)) return false;
  if (value.st !== 'a' && value.st !== 'n' && value.st !== 'u') return false;
  if (!isOptionalString(value.L) || !isOptionalString(value.U) || !isOptionalString(value.nt)) return false;
  const hasV = value.p.includes('v');
  if (value.st === 'a' && (value.p === '' || value.U !== undefined)) return false;
  if (value.st === 'n' && (value.p !== '' || value.L !== undefined || value.U !== undefined)) return false;
  if (value.U !== undefined && hasV) return false;
  if (value.L !== undefined && (!hasV || categoryId !== 'backup')) return false;
  return true;
};

const isV2System = (value: unknown): value is V2System => {
  if (!isRecord(value)) return false;
  if (value.t !== null && typeof value.t !== 'string') return false;
  if (typeof value.n !== 'string' || typeof value.vd !== 'string' || typeof value.sn !== 'string') return false;
  if (value.rf !== undefined) {
    if (!isRecord(value.rf)) return false;
    for (const [key, flag] of Object.entries(value.rf)) {
      if (!FLAG_KEYS.has(key) || (flag !== 'pending' && flag !== 'cleared')) return false;
    }
  }
  if (value.pv !== undefined && !(isRecord(value.pv) && typeof value.pv.lr === 'string' && PARTY_CODES.test(value.pv.lr))) {
    return false;
  }
  if (!isRecord(value.a)) return false;
  const keys = Object.keys(value.a);
  if (keys.length !== CATEGORIES.length) return false;
  const cells = value.a;
  return CATEGORIES.every((category) => isV2Cell(category.id, cells[category.id]));
};

const isV2Matrix = (value: unknown): value is V2Matrix => (
  isRecord(value) && value.v === 2 && typeof value.c === 'string' && typeof value.m === 'string'
  && (value.d === null || (typeof value.d === 'string' && isCalendarDate(value.d)))
  && Array.isArray(value.s) && value.s.every(isV2System)
);

const fromV2Cell = (cell: V2Cell): Cell => ({
  parties: sortParties(parseV1Parties(cell.p) as Party[]),
  state: CODE_TO_STATE[cell.st],
  ...(cell.L !== undefined ? { limitedRecovery: { note: cell.L } } : {}),
  ...(cell.U !== undefined ? { vendorUnverified: { note: cell.U } } : {}),
  ...(cell.nt !== undefined ? { note: cell.nt } : {}),
});

export const fromV2Matrix = (shared: V2Matrix): MatrixState => {
  const systems = shared.s.map((saved, index): MatrixSystem => {
    const cells = {} as MatrixSystem['cells'];
    for (const category of CATEGORIES) cells[category.id] = fromV2Cell(saved.a[category.id]);
    const provenance: LegacyProvenance | undefined = saved.pv ? { loggingResponse: parseV1Parties(saved.pv.lr) } : undefined;
    return {
      ...createSystem(index + 1),
      templateId: saved.t,
      name: saved.n,
      vendor: saved.vd,
      scopeNote: saved.sn,
      cells,
      reviewFlags: { ...(saved.rf ?? {}) },
      ...(provenance ? { provenance } : {}),
      expanded: false,
    };
  });
  return { customer: shared.c, msp: shared.m, preparedDate: shared.d, systems, nextId: systems.length + 1 };
};

/* ---------------------------------------------------------------- bytes and compression */

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('Invalid characters');
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)), (character) => character.charCodeAt(0));
};

const readAll = async (stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new LinkTooLargeError();
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
};

const streamOf = (bytes: Uint8Array): ReadableStream<Uint8Array> => new ReadableStream({
  start(controller) {
    controller.enqueue(bytes);
    controller.close();
  },
});

type BytePair = ReadableWritablePair<Uint8Array, Uint8Array>;
const deflate = (bytes: Uint8Array) => readAll(
  streamOf(bytes).pipeThrough(new CompressionStream('deflate-raw') as unknown as BytePair), Number.POSITIVE_INFINITY,
);
const inflate = (bytes: Uint8Array) => readAll(
  streamOf(bytes).pipeThrough(new DecompressionStream('deflate-raw') as unknown as BytePair), MAX_JSON_BYTES,
);

/* ---------------------------------------------------------------- public API */

export const isEmptyMatrix = (state: MatrixState) => !state.customer && !state.msp && state.systems.length === 0;

/** Encode the current state as a v2 hash body (without "#"). Throws LinkTooLargeError when over the limit. */
export const encodeHash = async (state: MatrixState): Promise<string> => {
  if (!isCompressionAvailable()) throw new Error('Compression is unavailable in this browser.');
  const json = new TextEncoder().encode(JSON.stringify(toV2Matrix(state)));
  if (json.byteLength > MAX_JSON_BYTES) throw new LinkTooLargeError();
  const hash = `${CURRENT_VERSION}.${toBase64Url(await deflate(json))}`;
  if (hash.length > MAX_HASH_LENGTH) throw new LinkTooLargeError();
  return hash;
};

export const decodeV2 = async (payload: string): Promise<DecodeResult> => {
  if (payload.length + 2 > MAX_HASH_LENGTH) return failed({ kind: 'tooLarge' });
  if (!isCompressionAvailable()) return failed({ kind: 'unavailable' });
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(await inflate(fromBase64Url(payload)));
    const shared: unknown = JSON.parse(json);
    if (!isV2Matrix(shared)) return failed({ kind: 'malformed' });
    return { state: fromV2Matrix(shared), status: { kind: 'ok' } };
  } catch (error) {
    return failed(error instanceof LinkTooLargeError ? { kind: 'tooLarge' } : { kind: 'malformed' });
  }
};

/** Decode without awaiting when possible (empty, v1, unsupported, malformed). Returns null for v2. */
export const decodeHashSync = (hash: string, preparedDateForNew: string | null): DecodeResult | null => {
  const classified = classifyHash(hash);
  switch (classified.format) {
    case 'empty':
      return { state: createEmptyState(preparedDateForNew), status: { kind: 'ok' } };
    case 'v1':
      return decodeV1(hash);
    case 'future':
      return failed({ kind: 'unsupported', version: classified.version });
    case 'malformed':
      return failed({ kind: 'malformed' });
    case 'v2':
      return null;
  }
};

export const decodeHash = async (hash: string, preparedDateForNew: string | null = null): Promise<DecodeResult> => {
  const immediate = decodeHashSync(hash, preparedDateForNew);
  if (immediate) return immediate;
  const classified = classifyHash(hash);
  return classified.format === 'v2' ? decodeV2(classified.payload) : failed({ kind: 'malformed' });
};

export const writeHash = (hash: string): void => {
  history.replaceState(null, '', `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`);
};
