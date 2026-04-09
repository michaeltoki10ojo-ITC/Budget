import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { OnboardingPage } from './OnboardingPage';

const completeOnboarding = vi.fn().mockResolvedValue(undefined);
const signOut = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    authUser: {
      id: 'user-1',
      email: 'michael@example.com'
    },
    completeOnboarding,
    signOut
  })
}));

vi.mock('./logoOptions', async () => {
  const actual = await vi.importActual<typeof import('./logoOptions')>('./logoOptions');

  return {
    ...actual,
    presetLogoToFile: vi.fn(async (preset: { id: string }) =>
      new File(['preset-logo'], `${preset.id}.png`, { type: 'image/png' })
    )
  };
});

describe('OnboardingPage', () => {
  it('starts with two accounts and lets the user add a third', async () => {
    const user = userEvent.setup();

    render(<OnboardingPage />);

    expect(screen.getByRole('button', { name: /start budgeting/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/account name/i)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /add account/i }));

    expect(screen.getAllByLabelText(/account name/i)).toHaveLength(3);
  });

  it('submits multiple accounts in creation order', async () => {
    const user = userEvent.setup();

    render(<OnboardingPage />);

    const accountNames = screen.getAllByLabelText(/account name/i);
    await user.clear(accountNames[0]);
    await user.type(accountNames[0], 'Main checking');
    await user.clear(accountNames[1]);
    await user.type(accountNames[1], 'House savings');
    await user.selectOptions(screen.getAllByLabelText(/account rounding/i)[1], 'nearest_10');
    await user.click(screen.getByRole('button', { name: /start budgeting/i }));

    expect(completeOnboarding).toHaveBeenCalledWith({
      accounts: [
        expect.objectContaining({ name: 'Main checking', roundingOverrideMode: 'nearest_5' }),
        expect.objectContaining({ name: 'House savings', roundingOverrideMode: 'nearest_10' })
      ]
    });
  });
});
