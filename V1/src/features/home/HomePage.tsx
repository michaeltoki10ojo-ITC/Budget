import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { formatCurrency, sumCents } from '../../lib/utils/money';
import type { AddAccountInput } from '../../lib/types';
import { AddAccountSheet } from './AddAccountSheet';
import styles from './HomePage.module.css';

export function HomePage() {
  const { accounts, assets, addAccount } = useBudgetApp();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalBalance = sumCents(accounts.map((account) => account.balanceCents));

  async function handleAddAccount(input: AddAccountInput) {
    setIsSubmitting(true);

    try {
      await addAccount(input);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.page}>
        <section className={styles.summaryCard}>
          <div className={styles.summaryTopRow}>
            <div>
              <p className={styles.summaryLabel}>Total tracked balance</p>
              <h2 className={styles.summaryValue}>{formatCurrency(totalBalance)}</h2>
            </div>
            <button
              type="button"
              className={styles.addAccountButton}
              onClick={() => setIsSheetOpen(true)}
            >
              Add account
            </button>
          </div>
          <p className={styles.summaryCaption}>
            Tap an account card to view expenses and make quick adjustments. You can now keep
            adding accounts whenever you need them.
          </p>
        </section>

        <section className={styles.accountList}>
          {accounts.map((account) => {
            const logo = assets[account.logoAssetId];

            return (
              <Link key={account.id} to={`/account/${account.id}`} className={styles.linkCard}>
                <motion.article
                  layoutId={`account-card-${account.id}`}
                  className={styles.accountCard}
                  whileTap={{ scale: 0.985 }}
                >
                  <motion.div layoutId={`account-logo-${account.id}`} className={styles.logoShell}>
                    {logo ? (
                      <img
                        src={logo.dataUrl}
                        alt={`${account.name} logo`}
                        className={styles.logoImage}
                      />
                    ) : (
                      <span>{account.name.slice(0, 1)}</span>
                    )}
                  </motion.div>

                  <div className={styles.accountMeta}>
                    <p className={styles.accountName}>{account.name}</p>
                    <p className={styles.accountHint}>Open account details</p>
                  </div>

                  <motion.p
                    layoutId={`account-balance-${account.id}`}
                    className={styles.accountBalance}
                  >
                    {formatCurrency(account.balanceCents)}
                  </motion.p>
                </motion.article>
              </Link>
            );
          })}
        </section>
      </div>

      <AddAccountSheet
        isOpen={isSheetOpen}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) {
            setIsSheetOpen(false);
          }
        }}
        onSubmit={handleAddAccount}
      />
    </>
  );
}
