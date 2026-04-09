import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AddAccountSheet } from './AddAccountSheet';

vi.mock('../setup/logoOptions', async () => {
  const actual = await vi.importActual<typeof import('../setup/logoOptions')>(
    '../setup/logoOptions'
  );

  return {
    ...actual,
    presetLogoToFile: vi.fn(async (preset: { id: string }) =>
      new File(['preset-logo'], `${preset.id}.png`, { type: 'image/png' })
    )
  };
});

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

  it('submits the preset logo label as the account name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddAccountSheet
        isOpen
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /venmo/i }));
    await user.click(screen.getByRole('button', { name: /add account/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Venmo'
      })
    );
  });

  it('lets the user choose the name after uploading a custom image', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddAccountSheet
        isOpen
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /payPal/i }));

    const uploadInput = screen.getByLabelText(/or upload your own/i);
    const customImage = new File(['custom-image'], 'wallet.png', { type: 'image/png' });

    await user.upload(uploadInput, customImage);

    const nameInput = screen.getByLabelText(/account name/i);

    expect(nameInput).toHaveValue('');
    expect(nameInput).not.toHaveAttribute('readonly');

    await user.type(nameInput, 'Travel wallet');
    await user.click(screen.getByRole('button', { name: /add account/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Travel wallet'
      })
    );
  });
});
