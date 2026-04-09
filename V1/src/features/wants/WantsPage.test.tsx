import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { WishlistPage } from './WantsPage';

const addWishlistItem = vi.fn();
const deleteWishlistItem = vi.fn();

vi.mock('../../app/state/BudgetAppContext', () => ({
  useBudgetApp: () => ({
    wishlistItems: [
      {
        id: 'wishlist-item-1',
        name: 'Headphones',
        priceCents: 12999,
        imageAssetId: 'asset-1',
        url: 'https://example.com/headphones',
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    ],
    assets: {
      'asset-1': {
        id: 'asset-1',
        dataUrl: 'data:image/png;base64,abc',
        mimeType: 'image/png',
        width: 48,
        height: 48,
        createdAt: '2026-03-30T00:00:00.000Z'
      }
    },
    addWishlistItem,
    deleteWishlistItem
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
