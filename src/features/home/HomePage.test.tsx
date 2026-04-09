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
        userId: 'user-1',
        name: 'Checking',
        openingBalanceCents: 10000,
        balanceCents: 12000,
        logoPath: 'user-1/accounts/checking.webp',
        roundingOverrideMode: 'nearest_5',
        sortOrder: 0,
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    ],
    assetUrls: {
      'user-1/accounts/checking.webp': 'https://example.com/checking.webp'
    },
    monthlySummary: {
      monthLabel: 'April 2026',
      incomeCents: 40000,
      expenseCents: 12000,
      adjustmentCents: 500,
      netCents: 28500,
      accountTotalCents: 12000
    },
    transactions: [
      {
        id: 'txn-1',
        userId: 'user-1',
        accountId: 'checking',
        type: 'expense',
        name: 'Groceries',
        amountCents: 5000,
        date: '2026-04-01',
        linkedTransferId: null,
        recurringRuleId: null,
        createdAt: '2026-04-01T00:00:00.000Z'
      }
    ],
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
