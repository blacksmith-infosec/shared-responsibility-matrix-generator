export type Party = 'v' | 'm' | 'c';
export type CategoryId =
  | 'data' | 'identity' | 'endpoint' | 'network' | 'config' | 'backup' | 'monitoring' | 'response';

/** Three cell states only. Unassigned may keep known parties (for example, a client requirement with no executor). */
export type CellState = 'assigned' | 'na' | 'unassigned';

export interface Qualifier {
  note: string;
}

export interface Cell {
  parties: Party[];
  state: CellState;
  /** Vendor operates a limited recovery capability (Backup only, only with V). */
  limitedRecovery?: Qualifier;
  /** A vendor contribution is plausible but unverified. Never with V; the cell stays unassigned until resolved. */
  vendorUnverified?: Qualifier;
  note?: string;
}

export type Cells = Record<CategoryId, Cell>;

export type ReviewFlag = 'categoriesBroadened' | 'monitoringUnconfirmed';
export type ReviewFlagState = 'pending' | 'cleared';
export type ReviewFlags = Partial<Record<ReviewFlag, ReviewFlagState>>;

/** The original combined v1 "Logging & response" assignment, kept after migration. */
export interface LegacyProvenance {
  loggingResponse: Party[];
}

export interface Category {
  id: CategoryId;
  main: string;
  sub: string;
  definition: string;
}

export interface SystemTemplate {
  id: string;
  name: string;
  defaultVendor: string;
  scopeNote: string;
  cells: Cells;
}

export interface MatrixSystem {
  id: string;
  templateId: string | null;
  name: string;
  vendor: string;
  scopeNote: string;
  cells: Cells;
  reviewFlags: ReviewFlags;
  provenance?: LegacyProvenance;
  expanded: boolean;
}

export interface MatrixState {
  customer: string;
  msp: string;
  /** Calendar date (YYYY-MM-DD) the matrix was prepared, or null when not recorded. */
  preparedDate: string | null;
  systems: MatrixSystem[];
  nextId: number;
}
