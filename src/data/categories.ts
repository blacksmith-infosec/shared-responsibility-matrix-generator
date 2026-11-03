import type { Category } from '../types/matrix';

export const CATEGORIES: Category[] = [
  { id: 'data',     main: 'Data',         sub: 'protection' },
  { id: 'identity', main: 'Identity',     sub: '& access' },
  { id: 'endpoint', main: 'Endpoint',     sub: 'security' },
  { id: 'network',  main: 'Network',      sub: 'security' },
  { id: 'app',      main: 'App security', sub: '& patching' },
  { id: 'backup',   main: 'Backup',       sub: '& recovery' },
  { id: 'logging',  main: 'Logging',      sub: '& monitoring' },
  { id: 'incident', main: 'Incident',     sub: 'response support' }
];
