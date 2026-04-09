import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

const saveRoundingPreferences = vi.fn().mockResolvedValue(undefined);

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    profile: {
      id: 'user-1',
      email: 'michael@example.com',
      roundingDefaultMode: 'nearest_5',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    accounts: [
      {
        id: 'checking',
        userId: 'user-1',
        name: 'Checking',
        openingBalanceCents: 10000,
        balanceCents: 12000,
        logoPath: null,
        roundingOverrideMode: 'nearest_5',
        sortOrder: 0,
        createdAt: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 'savings',
        userId: 'user-1',
        name: 'Savings',
        openingBalanceCents: 20000,
        balanceCents: 22000,
        logoPath: null,
        roundingOverrideMode: 'exact',
        sortOrder: 1,
        createdAt: '2026-04-01T00:00:00.000Z'
      }
    ],
    saveRoundingPreferences
  })
}));

describe('SettingsPage', () => {
  it('warns and requests a balance review only for affected accounts', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.selectOptions(screen.getAllByLabelText(/account rounding/i)[0], 'nearest_10');

    expect(screen.getByText(/review required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/re-enter opening balance/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/account rounding/i)).toHaveLength(2);
  });

  it('saves the new account mode and reviewed opening balance', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.selectOptions(screen.getAllByLabelText(/account rounding/i)[0], 'nearest_10');

    const reviewInput = screen.getByLabelText(/re-enter opening balance/i);
    await user.type(reviewInput, '101');
    await user.tab();
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(saveRoundingPreferences).toHaveBeenCalledWith({
      accountOverrides: [
        {
          accountId: 'checking',
          roundingOverrideMode: 'nearest_10'
        },
        {
          accountId: 'savings',
          roundingOverrideMode: 'exact'
        }
      ],
      openingBalanceUpdates: [
        {
          accountId: 'checking',
          openingBalanceCents: 10000
        }
      ]
    });
  });
});
