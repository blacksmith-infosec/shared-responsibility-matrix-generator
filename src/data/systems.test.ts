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

  it('keeps every template addressable with eight valid cells that follow the cell rules', () => {
    const ids = SYSTEM_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of SYSTEM_TEMPLATES) {
      expect(Object.keys(template.cells)).toEqual(CATEGORIES.map((category) => category.id));
      for (const cell of Object.values(template.cells)) {
        expect(new Set(cell.parties).size).toBe(cell.parties.length);
        expect(cell.parties.every((party) => ['v', 'm', 'c'].includes(party))).toBe(true);
        if (cell.state === 'assigned') expect(cell.parties.length).toBeGreaterThan(0);
        if (cell.state === 'na') expect(cell.parties).toEqual([]);
        if (cell.vendorUnverified) expect(cell.parties).not.toContain('v');
        if (cell.limitedRecovery) expect(cell.parties).toContain('v');
      }
    }
  });

  it('focuses on client systems rather than MSP business administration', () => {
    expect(SYSTEM_TEMPLATES.some((template) => /\b(?:RMM|PSA|Automate)\b/i.test(template.name))).toBe(false);
  });

  it('keeps legacy template ids so existing quick-start buttons and saved links still resolve', () => {
    expect(SYSTEM_TEMPLATES.map((template) => template.id)).toEqual(expect.arrayContaining(
      ['m365', 'endpoints', 'network', 'backup'],
    ));
  });
});
