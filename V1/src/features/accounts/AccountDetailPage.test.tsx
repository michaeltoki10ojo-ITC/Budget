import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AccountDetailPage } from './AccountDetailPage';

const quickAdjustBalance = vi.fn();
const addExpense = vi.fn();
const deleteExpense = vi.fn();

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
    expenses: [],
    quickAdjustBalance,
    addExpense,
    deleteExpense
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

  it('fills the expense name from suggested expenses', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/account/checking']}>
        <Routes>
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Groceries' }));

    expect(screen.getByLabelText(/expense name/i)).toHaveValue('Groceries');
  });

  it('rounds expense amounts up to the nearest five dollars', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/account/checking']}>
        <Routes>
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const amountInput = screen.getByLabelText(/amount/i);

    await user.clear(amountInput);
    await user.type(amountInput, '21');
    await user.tab();

    expect(amountInput).toHaveValue(25);
    expect(screen.getByText('Rounded to $25.00.')).toBeInTheDocument();
  });
});
