// data/systems.js
// Catalog of business systems with default responsibility assignments.
//
// Each system has an `assignments` map keyed by category id, with a value
// array of party codes:
//   'v' = vendor / platform provider
//   'm' = MSP
//   'c' = client / customer
//
// An empty array means the category does not apply to that system.
// These defaults assume an MSP-managed engagement, not customer-self-managed.
// They are starting points; the tool will let MSPs override per engagement
// in later versions.

window.SRM_DATA = window.SRM_DATA || {};

window.SRM_DATA.systems = [
  {
    id: 'm365',
    name: 'Microsoft 365',
    defaultVendor: 'Microsoft',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m', 'v'],
      endpoint: [],
      network:  ['v'],
      app:      ['m', 'v'],
      backup:   ['m'],
      logging:  ['m', 'v']
    }
  },
  {
    id: 'entra',
    name: 'Microsoft Entra ID',
    defaultVendor: 'Microsoft',
    assignments: {
      data:     [],
      identity: ['m', 'v'],
      endpoint: [],
      network:  ['v'],
      app:      ['m', 'v'],
      backup:   ['v'],
      logging:  ['m', 'v']
    }
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    defaultVendor: 'Microsoft',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m', 'v'],
      endpoint: ['m'],
      network:  ['m', 'v'],
      app:      ['m', 'c'],
      backup:   ['m', 'v'],
      logging:  ['m', 'v']
    }
  },
  {
    id: 'aws',
    name: 'AWS',
    defaultVendor: 'Amazon Web Services',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m', 'v'],
      endpoint: ['m'],
      network:  ['m', 'v'],
      app:      ['m', 'c'],
      backup:   ['m', 'v'],
      logging:  ['m', 'v']
    }
  },
  {
    id: 'gworkspace',
    name: 'Google Workspace',
    defaultVendor: 'Google',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m', 'v'],
      endpoint: [],
      network:  ['v'],
      app:      ['m', 'v'],
      backup:   ['m'],
      logging:  ['m', 'v']
    }
  },
  {
    id: 'endpoints',
    name: 'Endpoints',
    defaultVendor: 'MS Defender',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m'],
      endpoint: ['m'],
      network:  ['m'],
      app:      ['m'],
      backup:   ['m'],
      logging:  ['m']
    }
  },
  {
    id: 'network',
    name: 'Network',
    defaultVendor: 'Fortinet',
    assignments: {
      data:     [],
      identity: ['m'],
      endpoint: [],
      network:  ['m'],
      app:      ['m'],
      backup:   ['m'],
      logging:  ['m']
    }
  },
  {
    id: 'backup',
    name: 'Backup',
    defaultVendor: 'Datto',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m'],
      endpoint: [],
      network:  [],
      app:      ['m'],
      backup:   ['m'],
      logging:  ['m']
    }
  },
  {
    id: 'saas',
    name: 'LOB SaaS',
    defaultVendor: 'Salesforce',
    assignments: {
      data:     ['c'],
      identity: ['m', 'c'],
      endpoint: [],
      network:  ['v'],
      app:      ['m', 'c'],
      backup:   ['c'],
      logging:  ['m']
    }
  }
];
