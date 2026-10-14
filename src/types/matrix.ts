export type Party = 'v' | 'm' | 'c';
export type CategoryId = 'data' | 'identity' | 'endpoint' | 'network' | 'app' | 'backup' | 'logging';
export type Assignments = Record<CategoryId, Party[]>;

export interface Category {
  id: CategoryId;
  main: string;
  sub: string;
}

export interface SystemTemplate {
  id: string;
  name: string;
  defaultVendor: string;
  assignments: Assignments;
}

export interface MatrixSystem {
  id: string;
  templateId: string | null;
  name: string;
  vendor: string;
  assignments: Assignments;
  expanded: boolean;
}

export interface MatrixState {
  customer: string;
  msp: string;
  systems: MatrixSystem[];
  nextId: number;
}
