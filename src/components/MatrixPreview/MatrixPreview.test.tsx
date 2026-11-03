import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import { createSystem } from '../../modules/matrix';
import type { MatrixSystem } from '../../types/matrix';
import { MatrixPreview } from './index';

const defaultProps = {
  customer: '', msp: '', systems: [], logoDataUrl: null,
  onChooseLogo: vi.fn(), onAdd: vi.fn(), artifactRef: createRef<HTMLDivElement>(),
};

describe('MatrixPreview', () => {
  it('includes legend guidance in the exported artifact', () => {
    render(<MatrixPreview {...defaultProps} />);
    const artifact = defaultProps.artifactRef.current;
    expect(artifact).not.toBeNull();
    if (!artifact) throw new Error('Matrix artifact is not rendered');
    expect(within(artifact).getByText(
      'Incident response support covers investigation, containment, and remediation within agreed service scope. '
      + 'Incident leadership, escalation, and decision authority are defined in the client\'s incident response plan.',
    )).toBeVisible();
    expect(within(artifact).getByText(
      'Vendors always secure, monitor, and respond to incidents in their own platforms, '
      + 'even where no vendor dot is shown.',
    )).toBeVisible();
    expect(within(artifact).getByText(
      'A vendor dot in Backup & recovery can mean a native recovery feature, such as a recycle bin, not a full backup.',
    )).toBeVisible();
  });

  it('exposes systems, categories, and assigned parties as an accessible table', () => {
    const system = createSystem(1);
    system.name = 'Client infrastructure';
    system.vendor = 'Example vendor';
    system.assignments = {
      data: ['v'], identity: ['m'], endpoint: ['c'], network: ['c', 'v'],
      app: ['c', 'v', 'm'], backup: [], logging: ['m', 'v'], incident: ['m', 'c'],
    };
    render(<MatrixPreview {...defaultProps} systems={[system, { ...createSystem(2), name: 'Email' }]} />);

    const preview = screen.getByRole('region', { name: 'Responsibility matrix preview' });
    expect(preview).toHaveAttribute('tabindex', '0');
    const table = within(preview).getByRole('table', { name: 'Shared responsibility matrix' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const columns = within(rows[0]).getAllByRole('columnheader');
    expect(columns).toHaveLength(9);
    expect(columns[0]).toHaveAccessibleName('System');
    expect(columns[1]).toHaveAccessibleName('Data classification');
    expect(columns[7]).toHaveAccessibleName('Logging & monitoring');
    expect(columns[8]).toHaveAccessibleName('Incident response support');
    columns.forEach((column) => expect(column).toHaveAttribute('scope', 'col'));

    const firstSystem = within(rows[1]);
    const rowHeader = firstSystem.getByRole('rowheader');
    expect(rowHeader).toHaveAttribute('scope', 'row');
    expect(rowHeader).toHaveAccessibleName('Client infrastructure Example vendor');
    const cells = firstSystem.getAllByRole('cell');
    const partyLabels = [
      'Vendor', 'MSP', 'Client', 'Vendor, Client', 'Vendor, MSP, Client', 'Unassigned', 'Vendor, MSP', 'MSP, Client',
    ];
    expect(cells).toHaveLength(partyLabels.length);
    cells.forEach((cell, index) => expect(cell).toHaveAccessibleName(partyLabels[index]));
    expect(within(rows[2]).getByRole('rowheader')).toHaveAccessibleName('Email');
    within(rows[2]).getAllByRole('cell').forEach((cell) => expect(cell).toHaveAccessibleName('Unassigned'));
  });

  it('keeps the empty preview, quickstart templates, and metadata', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { container } = render(<MatrixPreview {...defaultProps} onAdd={onAdd} />);
    expect(screen.getByText('Start with a template')).toBeInTheDocument();
    expect(screen.getByText('Customer name')).toBeInTheDocument();
    expect(screen.getByText('MSP name')).toBeInTheDocument();
    expect(screen.getByText('Multiple filled dots indicate shared responsibility.')).toBeInTheDocument();
    const quickstartLabels = Array.from(container.querySelectorAll('.artifact-quickstart-btn'))
      .map((button) => button.textContent);
    expect(quickstartLabels).toEqual([
      'Microsoft 365', 'Windows endpoints', 'Fortinet FortiGate', 'Datto SIRIS',
    ]);
    await user.click(screen.getByRole('button', { name: 'Microsoft 365' }));
    expect(onAdd).toHaveBeenCalledWith(SYSTEM_TEMPLATES[0]);
    await user.click(screen.getByRole('button', { name: 'Datto SIRIS' }));
    expect(onAdd).toHaveBeenLastCalledWith(SYSTEM_TEMPLATES.find((template) => template.id === 'backup'));
  });

  it('renders every responsibility column and preserves party dot order', () => {
    const system: MatrixSystem = {
      id: 'sys-1', templateId: 'm365', name: 'Microsoft 365', vendor: 'Microsoft',
      assignments: SYSTEM_TEMPLATES[0].assignments, expanded: true,
    };
    const { container } = render(
      <MatrixPreview {...defaultProps} customer="Acme" msp="Example MSP" systems={[system]} />,
    );
    expect(screen.queryByText('Start with a template')).not.toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Example MSP')).toBeInTheDocument();
    expect(container.querySelectorAll('.m-hcell')).toHaveLength(9);
    expect(container.querySelectorAll('.m-cell')).toHaveLength(8);
    const dataDots = container.querySelectorAll('.m-cell')[0].querySelectorAll('.dot');
    expect(dataDots[0]).toHaveClass('v', 'on');
    expect(dataDots[1]).toHaveClass('m', 'on');
    expect(dataDots[2]).toHaveClass('c', 'on');
    expect(container.querySelectorAll('.m-cell')[2]).toHaveTextContent('—');
    expect(defaultProps.artifactRef.current).toHaveAttribute('id', 'artifact');
  });

  it('renders blank and hostile system names as plain text', () => {
    const system: MatrixSystem = {
      id: 'sys-1', templateId: null, name: '', vendor: '',
      assignments: SYSTEM_TEMPLATES[0].assignments, expanded: true,
    };
    const { container, rerender } = render(<MatrixPreview {...defaultProps} systems={[system]} />);
    expect(screen.getByText('Untitled system')).toBeInTheDocument();
    expect(container.querySelector('.m-rsub')).not.toBeInTheDocument();
    rerender(<MatrixPreview {...defaultProps} systems={[{ ...system, name: '<img src=x onerror=alert(1)>' }]} />);
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('#matrix img')).not.toBeInTheDocument();
  });

  it('opens upload from the empty logo and shows an uploaded image', async () => {
    const user = userEvent.setup();
    const onChooseLogo = vi.fn();
    const { rerender } = render(<MatrixPreview {...defaultProps} onChooseLogo={onChooseLogo} />);
    const upload = screen.getByRole('button', { name: 'Choose MSP logo' });
    await user.click(upload);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onChooseLogo).toHaveBeenCalledTimes(3);
    rerender(<MatrixPreview {...defaultProps} onChooseLogo={onChooseLogo} logoDataUrl="data:image/png;base64,aW1hZ2U=" />);
    expect(screen.getByRole('img', { name: 'MSP logo' })).toHaveAttribute('src', 'data:image/png;base64,aW1hZ2U=');
    expect(screen.queryByRole('button', { name: 'Choose MSP logo' })).not.toBeInTheDocument();
  });

  it('formats the current month and year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    render(<MatrixPreview {...defaultProps} />);
    expect(screen.getByText('October 2026')).toBeInTheDocument();
  });
});
