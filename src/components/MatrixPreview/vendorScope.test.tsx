import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MatrixPreview } from './index';

it('explains vendor participation in contracted managed security services', () => {
  render(<MatrixPreview customer="" msp="" systems={[]} logoDataUrl={null}
    onChooseLogo={vi.fn()} onAdd={vi.fn()} artifactRef={createRef<HTMLDivElement>()} />);
  const vendorLegend = screen.getByTitle(/contracted managed security services/);
  expect(vendorLegend).toHaveTextContent('Vendor / platform provider');
  expect(vendorLegend).toHaveAttribute('title', expect.stringContaining('Tenant configuration'));
});
