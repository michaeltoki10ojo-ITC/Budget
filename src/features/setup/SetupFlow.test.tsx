import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SetupFlow } from './SetupFlow';

const completeSetup = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    completeSetup
  })
}));

describe('SetupFlow', () => {
  it('moves from pin step to account setup when the pin is valid', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to accounts/i }));

    expect(screen.getByText(/checking/i)).toBeInTheDocument();
    expect(screen.getByText(/finish setup/i)).toBeInTheDocument();
  });

  it('rounds starter balances down to the nearest five dollars', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to accounts/i }));

    const firstBalanceInput = screen.getAllByLabelText(/starting balance/i)[0];

    await user.clear(firstBalanceInput);
    await user.type(firstBalanceInput, '23');
    await user.tab();

    expect(firstBalanceInput).toHaveValue(20);
    expect(screen.getByText('Rounded to $20.00.')).toBeInTheDocument();
  });
});
