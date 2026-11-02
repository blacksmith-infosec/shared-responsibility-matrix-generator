import type { Cell, Cells, LegacyProvenance, Party, ReviewFlags } from '../types/matrix';

/**
 * Frozen reading of saved-link format v1 (seven positional categories).
 * Never derive this from CATEGORIES or current templates: v1 links must keep their meaning forever.
 * 0 data, 1 identity, 2 endpoint, 3 network, 4 app security and patching, 5 backup, 6 logging and response.
 */
export const V1_POSITION_COUNT = 7;
const V1_PARTIES: readonly Party[] = ['v', 'm', 'c'];

export const parseV1Parties = (codes: string): Party[] => (
  V1_PARTIES.filter((party) => codes.includes(party))
);

const toCell = (parties: Party[]): Cell => (
  parties.length > 0 ? { parties, state: 'assigned' } : { parties: [], state: 'unassigned' }
);

export interface MigratedV1Row {
  cells: Cells;
  reviewFlags: ReviewFlags;
  provenance: LegacyProvenance;
}

/**
 * Migrate one v1 row (P5r): broadened categories keep their dots with a review flag; legacy blanks are unassigned;
 * the combined Logging & response cell is preserved as provenance and only suggested for Monitoring (unconfirmed);
 * Incident response starts unassigned.
 */
export const migrateV1Row = (positions: readonly string[]): MigratedV1Row => {
  const at = (index: number) => parseV1Parties(positions[index] ?? '');
  const loggingResponse = at(6);
  return {
    cells: {
      data: toCell(at(0)),
      identity: toCell(at(1)),
      endpoint: toCell(at(2)),
      network: toCell(at(3)),
      config: toCell(at(4)),
      backup: toCell(at(5)),
      monitoring: { parties: [...loggingResponse], state: 'unassigned' },
      response: { parties: [], state: 'unassigned' },
    },
    reviewFlags: {
      categoriesBroadened: 'pending',
      ...(loggingResponse.length > 0 ? { monitoringUnconfirmed: 'pending' as const } : {}),
    },
    provenance: { loggingResponse },
  };
};

/** Interim template conversion used until the approved templates land (not a migration of saved data). */
export const cellsFromV1Positions = (positions: readonly string[]): Cells => {
  const at = (index: number) => parseV1Parties(positions[index] ?? '');
  return {
    data: toCell(at(0)),
    identity: toCell(at(1)),
    endpoint: toCell(at(2)),
    network: toCell(at(3)),
    config: toCell(at(4)),
    backup: toCell(at(5)),
    monitoring: toCell(at(6)),
    response: { parties: [], state: 'unassigned' },
  };
};
