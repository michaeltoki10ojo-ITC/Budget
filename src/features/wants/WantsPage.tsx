import { useState } from 'react';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { formatCurrency, sumCents } from '../../lib/utils/money';
import type { AddWishlistInput } from '../../lib/types';
import { WishlistFormSheet } from './WantFormSheet';
import styles from './WantsPage.module.css';

export function WishlistPage() {
  const { wishlistItems, assetUrls, addWishlistItem, removeWishlistItem } = useBudgetApp();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalWishlistValue = sumCents(
    wishlistItems.map((wishlistItem) => wishlistItem.priceCents)
  );

  async function handleAddWishlistItem(input: AddWishlistInput) {
    setIsSubmitting(true);

    try {
      await addWishlistItem(input);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.page}>
        <section className={styles.totalCard}>
          <p className={styles.totalLabel}>Wishlist total</p>
          <h2 className={styles.totalValue}>{formatCurrency(totalWishlistValue)}</h2>
          <p className={styles.totalCaption}>
            Save the things you want to buy later, complete with an optional image and link.
          </p>
        </section>

        <section className={styles.wantList}>
          {wishlistItems.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Your wishlist is empty</h3>
              <p>Tap the plus button to save your first wishlist item.</p>
            </div>
          ) : (
            wishlistItems.map((wishlistItem) => {
              const image = wishlistItem.imagePath
                ? assetUrls[wishlistItem.imagePath]
                : undefined;

              return (
                <article key={wishlistItem.id} className={styles.wantCard}>
                  <div className={styles.imageFrame}>
                    {image ? (
                      <img src={image} alt={wishlistItem.name} />
                    ) : (
                      <span>{wishlistItem.name.slice(0, 1)}</span>
                    )}
                  </div>

                  <div className={styles.wantMeta}>
                    <h3>{wishlistItem.name}</h3>
                    <p>{formatCurrency(wishlistItem.priceCents)}</p>
                    <div className={styles.actions}>
                      <a
                        href={wishlistItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.linkButton}
                      >
                        Open link
                      </a>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${wishlistItem.name}" from your wishlist?`
                            )
                          ) {
                            void removeWishlistItem(wishlistItem.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <button type="button" className={styles.fab} onClick={() => setIsSheetOpen(true)}>
          +
        </button>
      </div>

      <WishlistFormSheet
        isOpen={isSheetOpen}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) {
            setIsSheetOpen(false);
          }
        }}
        onSubmit={handleAddWishlistItem}
      />
    </>
  );
}
