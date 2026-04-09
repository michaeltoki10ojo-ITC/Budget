import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { HomePage } from './HomePage';

const addAccount = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    accounts: [
      {
        id: 'checking',
        name: 'Checking',
        logoAssetId: 'logo-1',
        balanceCents: 12000,
        sortOrder: 0,
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    ],
    assets: {
      'logo-1': {
        id: 'logo-1',
        dataUrl: 'data:image/png;base64,abc',
        mimeType: 'image/png',
        width: 32,
        height: 32,
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    },
    addAccount
  })
}));

describe('HomePage', () => {
  it('opens the add account sheet', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /add account/i }));

    expect(screen.getByText(/add another account to your budget/i)).toBeInTheDocument();
  });
});
