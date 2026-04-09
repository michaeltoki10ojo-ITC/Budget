import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SetupFlow } from './SetupFlow';

const completeSetup = vi.fn();

vi.mock('./logoOptions', async () => {
  const actual = await vi.importActual<typeof import('./logoOptions')>('./logoOptions');

  return {
    ...actual,
    presetLogoToFile: vi.fn(async (preset: { id: string }) =>
      new File(['preset-logo'], `${preset.id}.png`, { type: 'image/png' })
    )
  };
});

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
    await user.click(screen.getByRole('button', { name: /continue to account setup/i }));

    expect(screen.getByText(/checking/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/starting balance/i)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /add another account/i })).toBeInTheDocument();
    expect(screen.getByText(/finish setup/i)).toBeInTheDocument();
  });

  it('rounds starter balances down to the nearest five dollars', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to account setup/i }));

    const firstBalanceInput = screen.getAllByLabelText(/starting balance/i)[0];

    await user.clear(firstBalanceInput);
    await user.type(firstBalanceInput, '23');
    await user.tab();

    expect(firstBalanceInput).toHaveValue(20);
    expect(screen.getByText('Rounded to $20.00.')).toBeInTheDocument();
  });

  it('allows renaming the first account during setup', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to account setup/i }));

    const accountNameInput = screen.getByLabelText(/account name/i);

    await user.clear(accountNameInput);
    await user.type(accountNameInput, 'Travel fund');

    expect(screen.getByText(/travel fund/i)).toBeInTheDocument();
  });

  it('lets you add another account during setup', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to account setup/i }));
    await user.click(screen.getByRole('button', { name: /add another account/i }));

    expect(screen.getAllByLabelText(/account name/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/starting balance/i)).toHaveLength(2);
    expect(screen.getByDisplayValue('Account 2')).toBeInTheDocument();
  });

  it('uses the preset logo name for the account name', async () => {
    const user = userEvent.setup();

    render(<SetupFlow />);

    await user.type(screen.getByLabelText(/create 4-digit pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /continue to account setup/i }));
    await user.click(screen.getByRole('button', { name: /payPal/i }));

    const accountNameInput = screen.getByLabelText(/account name/i);

    expect(accountNameInput).toHaveValue('PayPal');
    expect(accountNameInput).toHaveAttribute('readonly');
    expect(
      screen.getByText(/preset logos name this account automatically/i)
    ).toBeInTheDocument();
  });
});
