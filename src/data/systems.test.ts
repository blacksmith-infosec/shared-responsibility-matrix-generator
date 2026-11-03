import { describe, expect, it } from 'vitest';
import { createSystem } from '../modules/matrix';
import { CATEGORIES } from './categories';
import { SYSTEM_TEMPLATES } from './systems';

const getTemplate = (id: string) => {
  const template = SYSTEM_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Missing system template: ${id}`);
  return template;
};

describe('client-facing system catalog', () => {
  it.each([
    ['aws', 'Amazon Web Services (AWS)', 'Amazon Web Services'],
    ['endpoints', 'Windows endpoints', 'Microsoft'],
    ['network', 'Fortinet FortiGate', 'Fortinet'],
    ['backup', 'Datto SIRIS', 'Datto'],
    ['saas', 'Salesforce Starter Suite', 'Salesforce'],
    ['intune', 'Microsoft Intune', 'Microsoft'],
    ['defender', 'Microsoft Defender for Business', 'Microsoft'],
    ['huntress', 'Huntress Managed EDR', 'Huntress'],
    ['sentinelone', 'SentinelOne Singularity Complete', 'SentinelOne'],
    ['sonicwall', 'SonicWall TZ Series', 'SonicWall'],
    ['unifi', 'UniFi Cloud Gateway', 'Ubiquiti'],
    ['dnsfilter', 'DNSFilter', 'DNSFilter'],
    ['datto-saas', 'Datto SaaS Protection', 'Datto'],
    ['cove', 'Cove Data Protection', 'N-able'],
    ['1password', '1Password Business', '1Password'],
    ['quickbooks', 'QuickBooks Online', 'Intuit'],
    ['hubspot', 'HubSpot Smart CRM', 'HubSpot'],
    ['slack', 'Slack', 'Slack'],
    ['zoom', 'Zoom Workplace', 'Zoom'],
  ])('adds %s with the verified product name and vendor', (id, name, vendor) => {
    expect(createSystem(1, getTemplate(id))).toMatchObject({ templateId: id, name, vendor });
  });

  it('keeps every template addressable with valid assignments for all eight categories', () => {
    const ids = SYSTEM_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of SYSTEM_TEMPLATES) {
      expect(Object.keys(template.assignments).sort()).toEqual(CATEGORIES.map((category) => category.id).sort());
      for (const parties of Object.values(template.assignments)) {
        expect(new Set(parties).size).toBe(parties.length);
        expect(parties.every((party) => ['v', 'm', 'c'].includes(party))).toBe(true);
      }
    }
  });

  it('focuses on client systems rather than MSP business administration', () => {
    expect(SYSTEM_TEMPLATES.some((template) => /\b(?:RMM|PSA|Automate)\b/i.test(template.name))).toBe(false);
  });

  it('includes Huntress managed response and keeps EDR separate from backup', () => {
    const huntress = createSystem(1, getTemplate('huntress'));
    expect(huntress.assignments.endpoint).toEqual(expect.arrayContaining(['v', 'm']));
    expect(huntress.assignments.logging).toEqual(expect.arrayContaining(['v', 'm']));
    for (const id of ['defender', 'huntress', 'sentinelone', 'dnsfilter']) {
      expect(createSystem(1, getTemplate(id)).assignments.backup).toEqual([]);
    }
  });

  it.each([
    { id: 'huntress', parties: ['v', 'm', 'c'] },
    { id: 'm365', parties: ['m', 'c'] },
    { id: 'sentinelone', parties: ['m', 'c'] },
    { id: 'quickbooks', parties: ['c'] },
  ])('assigns incident response support within the service scope of $id', ({ id, parties }) => {
    expect(createSystem(1, getTemplate(id)).assignments.incident).toEqual(parties);
  });

  it.each(['backup', 'datto-saas', 'cove'])('includes vendor backup infrastructure for %s', (id) => {
    const system = createSystem(1, getTemplate(id));
    expect(system.assignments.backup).toEqual(expect.arrayContaining(['v', 'm']));
    expect(system.assignments.endpoint).toEqual([]);
  });

  it('leaves accounting data and recovery decisions with the client', () => {
    const quickbooks = createSystem(1, getTemplate('quickbooks'));
    expect(quickbooks.assignments.data).toEqual(['c']);
    expect(quickbooks.assignments.backup).toEqual(['c']);
  });
});
