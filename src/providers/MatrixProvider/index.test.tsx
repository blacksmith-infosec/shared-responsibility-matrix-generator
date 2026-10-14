import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { decodeHash } from '../../modules/persistence';
import { MatrixProvider, useMatrix } from './index';

const Editor = () => {
  const { state, dispatch } = useMatrix();
  return <input aria-label="Client" value={state.customer}
    onChange={(event) => dispatch({ type: 'branding', field: 'customer', value: event.target.value })} />;
};

describe('matrix persistence', () => {
  it('debounces changes and restores them when mounted again', () => {
    vi.useFakeTimers();
    const first = render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    act(() => vi.advanceTimersByTime(399));
    expect(location.hash).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(decodeHash(location.hash.slice(1)).customer).toBe('Client');
    first.unmount();
    render(<MatrixProvider><Editor /></MatrixProvider>);
    expect(screen.getByRole('textbox')).toHaveValue('Client');
  });

  it('cancels pending writes after unmount', () => {
    vi.useFakeTimers();
    const app = render(<MatrixProvider><Editor /></MatrixProvider>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Client' } });
    app.unmount();
    act(() => vi.advanceTimersByTime(400));
    expect(location.hash).toBe('');
  });
});
