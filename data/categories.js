// data/categories.js
// The seven responsibility categories shown as columns in the matrix.
// Each has a two-line label: a main word and a subtitle.

window.SRM_DATA = window.SRM_DATA || {};

window.SRM_DATA.categories = [
  { id: 'data',     main: 'Data',         sub: 'classification' },
  { id: 'identity', main: 'Identity',     sub: 'access' },
  { id: 'endpoint', main: 'Endpoint',     sub: 'protection' },
  { id: 'network',  main: 'Network',      sub: 'controls' },
  { id: 'app',      main: 'App security', sub: '& patching' },
  { id: 'backup',   main: 'Backup',       sub: 'recovery' },
  { id: 'logging',  main: 'Logging',      sub: '& response' }
];
