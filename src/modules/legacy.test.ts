import { describe, expect, it } from 'vitest';
import { cellsFromV1Positions, migrateV1Row, parseV1Parties } from './legacy';

describe('frozen v1 reading', () => {
  it('parses party codes in canonical order and ignores unknown characters', () => {
    expect(parseV1Parties('cxmv')).toEqual(['v', 'm', 'c']);
    expect(parseV1Parties('')).toEqual([]);
  });

  it('keeps broadened-category dots, makes blanks unassigned, and flags the row', () => {
    const row = migrateV1Row(['cm', 'mv', '', 'v', 'mv', 'm', 'mv']);
    expect(row.cells.data).toEqual({ parties: ['m', 'c'], state: 'assigned' });
    expect(row.cells.endpoint).toEqual({ parties: [], state: 'unassigned' });
    expect(row.cells.config).toEqual({ parties: ['v', 'm'], state: 'assigned' });
    expect(row.reviewFlags).toEqual({ categoriesBroadened: 'pending', monitoringUnconfirmed: 'pending' });
  });

  it('preserves Logging & response as provenance, suggests it for Monitoring unconfirmed, and leaves IR unassigned', () => {
    const row = migrateV1Row(['', '', '', '', '', '', 'vmc']);
    expect(row.provenance).toEqual({ loggingResponse: ['v', 'm', 'c'] });
    expect(row.cells.monitoring).toEqual({ parties: ['v', 'm', 'c'], state: 'unassigned' });
    expect(row.cells.response).toEqual({ parties: [], state: 'unassigned' });
  });

  it('does not raise the Monitoring flag when the old combined cell was empty and tolerates short rows', () => {
    const row = migrateV1Row(['m']);
    expect(row.reviewFlags).toEqual({ categoriesBroadened: 'pending' });
    expect(row.provenance).toEqual({ loggingResponse: [] });
    expect(row.cells.backup).toEqual({ parties: [], state: 'unassigned' });
  });

  it('converts interim template positions without review flags', () => {
    const cells = cellsFromV1Positions(['c', '', '', '', '', '', 'm']);
    expect(cells.monitoring).toEqual({ parties: ['m'], state: 'assigned' });
    expect(cells.response).toEqual({ parties: [], state: 'unassigned' });
  });
});
