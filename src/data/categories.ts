import type { Category } from '../types/matrix';

export const CATEGORIES: Category[] = [
  { id: 'data',     main: 'Data',         sub: 'classification' },
  { id: 'identity', main: 'Identity',     sub: 'access' },
  { id: 'endpoint', main: 'Endpoint',     sub: 'protection' },
  { id: 'network',  main: 'Network',      sub: 'controls' },
  { id: 'app',      main: 'App security', sub: '& patching' },
  { id: 'backup',   main: 'Backup',       sub: 'recovery' },
  { id: 'logging',  main: 'Logging',      sub: '& response' }
];
