import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { WishlistPage } from './WantsPage';

const addWishlistItem = vi.fn();
const removeWishlistItem = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    wishlistItems: [
      {
        id: 'wishlist-item-1',
        userId: 'user-1',
        name: 'Headphones',
        priceCents: 12999,
        imagePath: 'user-1/wishlist/headphones.webp',
        url: 'https://example.com/headphones',
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    ],
    assetUrls: {
      'user-1/wishlist/headphones.webp': 'https://example.com/headphones.webp'
    },
    roundingDefaultMode: 'nearest_5',
    addWishlistItem,
    removeWishlistItem
  })
}));

describe('WishlistPage', () => {
  it('shows the running total and opens the create form', async () => {
    const user = userEvent.setup();

    render(<WishlistPage />);

    expect(screen.getByText(/wishlist total/i)).toBeInTheDocument();
    expect(screen.getAllByText('$129.99')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '+' }));

    expect(screen.getByText(/add something you're saving for/i)).toBeInTheDocument();
  });
});
