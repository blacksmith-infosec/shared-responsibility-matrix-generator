import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './index';

describe('BrandMark', () => {
  it('renders the same decorative brand shape at either display size', () => {
    const { container, rerender } = render(<BrandMark className="brand-mark" />);
    const mark = container.querySelector('svg');
    expect(mark).toHaveAttribute('viewBox', '0 0 1010.16 1200');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveClass('brand-mark');
    expect(mark?.querySelector('polygon')).toBeInTheDocument();

    rerender(<BrandMark />);
    expect(container.querySelector('svg')).not.toHaveAttribute('class');
  });
});
