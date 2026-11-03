import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import type { MatrixSystem } from '../../types/matrix';
import { SystemList } from './index';

const microsoft365: MatrixSystem = {
  id: 'sys-1', templateId: 'm365', name: 'Microsoft 365', vendor: 'Microsoft',
  assignments: SYSTEM_TEMPLATES[0].assignments, expanded: true,
};

const createHandlers = () => ({
  onAdd: vi.fn(), onRemove: vi.fn(), onChange: vi.fn(),
  onToggleExpanded: vi.fn(), onToggleParty: vi.fn(),
});

describe('SystemList', () => {
  it('offers current client-facing products across the MSP and small-business catalog', async () => {
    const user = userEvent.setup();
    const { container } = render(<SystemList systems={[]} {...createHandlers()} />);
    await user.click(screen.getByRole('button', { name: /Add system/ }));
    const menuLabels = Array.from(container.querySelectorAll('.menu-item > span:first-child'))
      .map((label) => label.textContent);
    expect(menuLabels).toEqual([
      'Custom (blank)',
      'Microsoft 365',
      'Microsoft Entra ID',
      'Microsoft Azure',
      'Amazon Web Services (AWS)',
      'Google Workspace',
      'Windows endpoints',
      'Fortinet FortiGate',
      'Datto SIRIS',
      'Salesforce Starter Suite',
      'Microsoft Intune',
      'Microsoft Defender for Business',
      'Huntress Managed EDR',
      'SentinelOne Singularity Complete',
      'SonicWall TZ Series',
      'UniFi Cloud Gateway',
      'DNSFilter',
      'Datto SaaS Protection',
      'Cove Data Protection',
      '1Password Business',
      'QuickBooks Online',
      'HubSpot Smart CRM',
      'Slack',
      'Zoom Workplace',
    ]);
  });

  it('shows the empty state and adds custom rows or available templates', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<SystemList systems={[]} {...handlers} />);
    expect(screen.getByText(/No systems yet/)).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: /Add system/ });
    expect(addButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(addButton);
    await user.click(screen.getByRole('button', { name: /Custom \(blank\)/ }));
    expect(handlers.onAdd).toHaveBeenLastCalledWith();
    expect(addButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(addButton);
    await user.click(screen.getByRole('button', { name: /Microsoft 365 Microsoft/ }));
    expect(handlers.onAdd).toHaveBeenLastCalledWith(SYSTEM_TEMPLATES[0]);
  });

  it('dismisses the template menu on Escape, outside clicks, or another button click', async () => {
    const user = userEvent.setup();
    render(<SystemList systems={[]} {...createHandlers()} />);
    const addButton = screen.getByRole('button', { name: /Add system/ });
    await user.click(addButton);
    await user.keyboard('{Escape}');
    expect(addButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(addButton);
    await user.click(document.body);
    expect(addButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(addButton);
    await user.click(addButton);
    expect(addButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves editable fields and selected responsibility controls', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    const { container } = render(<SystemList systems={[microsoft365]} {...handlers} />);
    expect(screen.getByText('1 system')).toBeInTheDocument();
    expect(container.querySelector('.system-card')).toHaveClass('expanded');
    const name = screen.getByRole('textbox', { name: 'System name' });
    const vendor = screen.getByRole('textbox', { name: 'Vendor' });
    fireEvent.change(name, { target: { value: 'Client mail' } });
    fireEvent.change(vendor, { target: { value: 'Mail vendor' } });
    expect(handlers.onChange).toHaveBeenCalledWith('sys-1', 'name', 'Client mail');
    expect(handlers.onChange).toHaveBeenCalledWith('sys-1', 'vendor', 'Mail vendor');

    const clientData = screen.getByRole('button', { name: 'Client: Data classification' });
    const vendorData = screen.getByRole('button', { name: 'Vendor: Data classification' });
    expect(clientData).toHaveAttribute('aria-pressed', 'true');
    expect(vendorData).toHaveAttribute('aria-pressed', 'true');
    await user.click(vendorData);
    expect(handlers.onToggleParty).toHaveBeenCalledWith('sys-1', 'data', 'v');
  });

  it('exposes one native expansion control and keeps mouse and keyboard actions independent', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<SystemList systems={[microsoft365]} {...handlers} />);
    expect(screen.getAllByRole('button', { name: /expand.*collapse/i })).toHaveLength(1);
    const toggle = screen.getByRole('button', { name: 'Expand/collapse' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'sys-1-body');
    await user.tab();
    expect(screen.getByRole('button', { name: /Add system/ })).toHaveFocus();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(handlers.onToggleExpanded).toHaveBeenCalledTimes(2);
    await user.click(screen.getByText('Microsoft 365'));
    await user.click(toggle);
    expect(handlers.onToggleExpanded).toHaveBeenCalledTimes(4);
    await user.click(screen.getByRole('button', { name: 'Remove system' }));
    expect(handlers.onRemove).toHaveBeenCalledWith('sys-1');
    expect(handlers.onToggleExpanded).toHaveBeenCalledTimes(4);
  });

  it('focuses remove after expand and removes with the keyboard without changing expansion', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<SystemList systems={[microsoft365]} {...handlers} />);
    screen.getByRole('button', { name: 'Expand/collapse' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Remove system' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(handlers.onRemove).toHaveBeenCalledWith('sys-1');
    expect(handlers.onToggleExpanded).not.toHaveBeenCalled();
  });

  it('omits used templates and the template heading after every template is in scope', async () => {
    const user = userEvent.setup();
    const systems = SYSTEM_TEMPLATES.map((template, index) => ({
      ...microsoft365, id: `sys-${index + 1}`, templateId: template.id, name: template.name, expanded: false,
    }));
    render(<SystemList systems={systems} {...createHandlers()} />);
    expect(screen.getByText('23 systems')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add system/ }));
    expect(screen.queryByText('From template')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Custom \(blank\)/ })).toBeVisible();
  });

  it('uses the untitled placeholder for a blank custom system', () => {
    const { container } = render(
      <SystemList systems={[{ ...microsoft365, name: '', vendor: '', templateId: null }]} {...createHandlers()} />,
    );
    expect(screen.getByText('Untitled system')).toHaveClass('placeholder');
    expect(container.querySelector('.card-vendor-display')).toBeEmptyDOMElement();
  });
});
