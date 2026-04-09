import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AccountDetailPage } from './AccountDetailPage';

const quickAdjustBalance = vi.fn();
const addTransaction = vi.fn();
const addTransfer = vi.fn();
const deleteTransaction = vi.fn();
const getAccountRoundingMode = vi.fn((accountId: string) =>
  accountId === 'checking' ? 'nearest_10' : 'nearest_5'
);

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
        roundingOverrideMode: 'nearest_10',
        sortOrder: 0,
        createdAt: '2026-03-30T00:00:00.000Z'
      },
      {
        id: 'savings',
        userId: 'user-1',
        name: 'Savings',
        openingBalanceCents: 5000,
        balanceCents: 7000,
        logoPath: null,
        roundingOverrideMode: 'nearest_5',
        sortOrder: 1,
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    ],
    assetUrls: {
      'user-1/accounts/checking.webp': 'https://example.com/checking.webp'
    },
    transactions: [],
    quickAdjustBalance,
    addTransaction,
    addTransfer,
    deleteTransaction,
    getAccountRoundingMode
  })
}));

describe('AccountDetailPage', () => {
  it('applies quick balance buttons', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/account/checking']}>
        <Routes>
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '+10' }));

    expect(quickAdjustBalance).toHaveBeenCalledWith('checking', 1000);
  });

  it('fills the transaction name from suggested labels', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/account/checking']}>
        <Routes>
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Groceries' }));

    expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument();
  });

  it('uses the account override when rounding entry amounts', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/account/checking']}>
        <Routes>
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const amountInput = screen.getAllByLabelText(/amount/i)[0];

    await user.clear(amountInput);
    await user.type(amountInput, '21');
    await user.tab();

    expect(amountInput).toHaveValue(30);
    expect(screen.getByText('Rounded to $30.00.')).toBeInTheDocument();
  });
});
