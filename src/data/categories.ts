import type { Category } from '../types/matrix';

export const CATEGORIES: Category[] = [
  {
    id: 'data', main: 'Data', sub: 'protection',
    definition: 'Classification, retention and deletion settings, DLP, sharing, data-level encryption and key governance.',
  },
  {
    id: 'identity', main: 'Identity', sub: '& access',
    definition: 'Account lifecycle, authentication and MFA, admin roles, access approval and review, SSO.',
  },
  {
    id: 'endpoint', main: 'Endpoint', sub: 'security',
    definition: 'Protective controls on devices and servers: EDR and anti-malware, device encryption, device control, host firewall.',
  },
  {
    id: 'network', main: 'Network', sub: 'security',
    definition: 'Network firewall rules, segmentation, remote access, DNS, web and email filtering, hosted network protection.',
  },
  {
    id: 'config', main: 'Configuration', sub: '& patching',
    definition: 'Baseline hardening not owned by another column, OS, application and firmware updates, vulnerability management.',
  },
  {
    id: 'backup', main: 'Backup', sub: '& recovery',
    definition: 'Backup scope, protection and retention of copies, RPO and RTO, executing restores and rollback, restore testing.',
  },
  {
    id: 'monitoring', main: 'Monitoring', sub: '& detection',
    definition: 'Log collection and retention, alert review and investigation, escalation of suspected incidents.',
  },
  {
    id: 'response', main: 'Incident', sub: 'response',
    definition: 'Declaration decision, incident investigation, containment and eradication, coordination, notification, forensics.',
  },
];
