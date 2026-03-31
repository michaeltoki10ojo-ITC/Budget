import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AddAccountSheet } from './AddAccountSheet';

describe('AddAccountSheet', () => {
  it('rounds new account balances down to the nearest five dollars', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AddAccountSheet
        isOpen
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const balanceInput = screen.getByLabelText(/starting balance/i);

    await user.clear(balanceInput);
    await user.type(balanceInput, '23');
    await user.tab();

    expect(balanceInput).toHaveValue(20);
    expect(screen.getByText('Rounded to $20.00.')).toBeInTheDocument();
  });
});
