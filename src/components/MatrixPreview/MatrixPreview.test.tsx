import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SYSTEM_TEMPLATES } from '../../data/systems';
import type { MatrixSystem } from '../../types/matrix';
import { MatrixPreview } from './index';

const defaultProps = {
  customer: '', msp: '', systems: [], logoDataUrl: null,
  onChooseLogo: vi.fn(), onAdd: vi.fn(), artifactRef: createRef<HTMLDivElement>(),
};

describe('MatrixPreview', () => {
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
    expect(container.querySelector('#matrix')).toHaveStyle({ gridTemplateColumns: '160px repeat(7, 1fr)' });
    expect(container.querySelectorAll('.m-hcell')).toHaveLength(8);
    expect(container.querySelectorAll('.m-cell')).toHaveLength(7);
    const dataDots = container.querySelectorAll('.m-cell')[0].querySelectorAll('.dot');
    expect(dataDots[0]).toHaveClass('v', 'off');
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
