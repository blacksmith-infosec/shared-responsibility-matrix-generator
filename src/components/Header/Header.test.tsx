import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './index';

const toggleTheme = vi.fn();
vi.mock('../../providers/ThemeProvider', () => ({ useTheme: () => ({ toggleTheme }) }));

describe('Header', () => {
  it('links to the project and Blacksmith and keeps the existing brand', async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href', 'https://github.com/blacksmith-infosec/shared-responsibility-matrix-generator',
    );
    expect(screen.getByRole('link', { name: 'Blacksmith' })).toHaveAttribute('href', 'https://blacksmithinfosec.com');
    expect(screen.getByText('Shared Responsibility Matrix')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(toggleTheme).toHaveBeenCalledOnce();
  });
});
