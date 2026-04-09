import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LockScreen } from './LockScreen';

const unlock = vi.fn();
const resetApp = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    unlock,
    resetApp
  })
}));

describe('LockScreen', () => {
  it('submits the pin after four digits', async () => {
    unlock.mockResolvedValueOnce(false);
    const user = userEvent.setup();

    render(<LockScreen />);

    for (const digit of ['1', '2', '3', '4']) {
      await user.click(screen.getByRole('button', { name: digit }));
    }

    await waitFor(() => expect(unlock).toHaveBeenCalledWith('1234'));
    expect(await screen.findByText(/incorrect pin/i)).toBeInTheDocument();
  });
});
