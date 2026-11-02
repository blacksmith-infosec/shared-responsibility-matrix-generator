import { cellsFromV1Positions } from '../modules/legacy';
import type { Party, SystemTemplate } from '../types/matrix';

// Client-facing systems for MSP-managed engagements. Product references are in README.md.
// Assignments model platform operation, delegated administration, and client decisions;
// confirm the actual service scope and delegation in each customer agreement.
// INTERIM (PR 1): the pre-audit assignments, read through the frozen v1 map. Replaced by the approved
// AUDIT.md draft 4 templates in PR 2. Not deployed (release gating).
type LegacyKey = 'data' | 'identity' | 'endpoint' | 'network' | 'app' | 'backup' | 'logging';
interface LegacyTemplate {
  id: string;
  name: string;
  defaultVendor: string;
  assignments: Record<LegacyKey, Party[]>;
}
const LEGACY_ORDER: LegacyKey[] = ['data', 'identity', 'endpoint', 'network', 'app', 'backup', 'logging'];

const LEGACY_TEMPLATES: LegacyTemplate[] = [
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
    name: 'Amazon Web Services (AWS)',
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
    // The whole device estate; security products below cover their own narrower scope.
    name: 'Windows endpoints',
    defaultVendor: 'Microsoft',
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
    // MSP operates the local appliance, including firmware and configuration backups.
    name: 'Fortinet FortiGate',
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
    name: 'Datto SIRIS',
    defaultVendor: 'Datto',
    assignments: {
      data:     ['c', 'm'],
      identity: ['m'],
      endpoint: [],
      network:  [],
      app:      ['m'],
      backup:   ['v', 'm'],
      logging:  ['m']
    }
  },
  {
    id: 'saas',
    name: 'Salesforce Starter Suite',
    defaultVendor: 'Salesforce',
    assignments: {
      data:     ['c'],
      identity: ['m', 'c'],
      endpoint: [],
      network:  ['v'],
      app:      ['v', 'm', 'c'],
      backup:   ['c'],
      logging:  ['v', 'm']
    }
  },
  {
    id: 'intune',
    name: 'Microsoft Intune',
    defaultVendor: 'Microsoft',
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: ['v', 'm'],
      network: ['v'],
      app: ['v', 'm'],
      backup: [],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'defender',
    name: 'Microsoft Defender for Business',
    defaultVendor: 'Microsoft',
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: ['v', 'm'],
      network: ['v'],
      app: ['v', 'm'],
      backup: [],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'huntress',
    name: 'Huntress Managed EDR',
    defaultVendor: 'Huntress',
    // Includes the vendor SOC; clients retain approval of business-impacting responses.
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: ['v', 'm'],
      network: ['v'],
      app: ['v', 'm'],
      backup: [],
      logging: ['v', 'm', 'c'],
    },
  },
  {
    id: 'sentinelone',
    name: 'SentinelOne Singularity Complete',
    defaultVendor: 'SentinelOne',
    // Automated EDR response; staffed MDR is separate, and rollback is not a backup plan.
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: ['v', 'm'],
      network: ['v'],
      app: ['v', 'm'],
      backup: [],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'sonicwall',
    name: 'SonicWall TZ Series',
    defaultVendor: 'SonicWall',
    // Local MSP administration; separately purchased vendor management is not assumed.
    assignments: {
      data: [],
      identity: ['m'],
      endpoint: [],
      network: ['m'],
      app: ['m'],
      backup: ['m'],
      logging: ['m'],
    },
  },
  {
    id: 'unifi',
    name: 'UniFi Cloud Gateway',
    defaultVendor: 'Ubiquiti',
    // The gateway and its local control plane are operated by the MSP.
    assignments: {
      data: [],
      identity: ['m'],
      endpoint: [],
      network: ['m'],
      app: ['m'],
      backup: ['m'],
      logging: ['m'],
    },
  },
  {
    id: 'dnsfilter',
    name: 'DNSFilter',
    defaultVendor: 'DNSFilter',
    // DNS policy and query logging complement firewalling and endpoint detection.
    assignments: {
      data: [],
      identity: ['m', 'c'],
      endpoint: [],
      network: ['v', 'm', 'c'],
      app: ['v', 'm'],
      backup: [],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'datto-saas',
    name: 'Datto SaaS Protection',
    defaultVendor: 'Datto',
    // Backup for Microsoft 365 and Google Workspace, not arbitrary SaaS applications.
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm'],
      backup: ['v', 'm', 'c'],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'cove',
    name: 'Cove Data Protection',
    defaultVendor: 'N-able',
    // Models server, workstation, and Microsoft 365 backup, not endpoint threat protection.
    assignments: {
      data: ['c', 'm'],
      identity: ['v', 'm', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm'],
      backup: ['v', 'm', 'c'],
      logging: ['v', 'm'],
    },
  },
  {
    id: '1password',
    name: '1Password Business',
    defaultVendor: '1Password',
    // Recovery covers vault/account access; this does not back up the client's devices.
    assignments: {
      data: ['c'],
      identity: ['v', 'm', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm', 'c'],
      backup: ['m', 'c'],
      logging: ['v', 'm', 'c'],
    },
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    defaultVendor: 'Intuit',
    // MSP support is limited to delegated access; accounting and approvals stay with the client.
    assignments: {
      data: ['c'],
      identity: ['m', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'c'],
      backup: ['c'],
      logging: ['v', 'c'],
    },
  },
  {
    id: 'hubspot',
    name: 'HubSpot Smart CRM',
    defaultVendor: 'HubSpot',
    assignments: {
      data: ['c'],
      identity: ['m', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm', 'c'],
      backup: ['m', 'c'],
      logging: ['v', 'm', 'c'],
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    defaultVendor: 'Slack',
    // Client retention/exports and MSP recovery planning are separate from service availability.
    assignments: {
      data: ['c', 'm'],
      identity: ['m', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm', 'c'],
      backup: ['m', 'c'],
      logging: ['v', 'm'],
    },
  },
  {
    id: 'zoom',
    name: 'Zoom Workplace',
    defaultVendor: 'Zoom',
    // Recording consent, retention, and exports remain client decisions.
    assignments: {
      data: ['c', 'm'],
      identity: ['m', 'c'],
      endpoint: [],
      network: ['v'],
      app: ['v', 'm', 'c'],
      backup: ['m', 'c'],
      logging: ['v', 'm'],
    },
  }
];

export const SYSTEM_TEMPLATES: SystemTemplate[] = LEGACY_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  defaultVendor: template.defaultVendor,
  scopeNote: '',
  cells: cellsFromV1Positions(LEGACY_ORDER.map((key) => template.assignments[key].join(''))),
}));
