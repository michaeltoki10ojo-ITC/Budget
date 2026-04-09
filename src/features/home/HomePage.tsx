import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { formatCurrency } from '../../lib/utils/money';
import type { AddAccountInput } from '../../lib/types';
import { AddAccountSheet } from './AddAccountSheet';
import styles from './HomePage.module.css';

export function HomePage() {
  const {
    accounts,
    assetUrls,
    addAccount,
    monthlySummary,
    transactions
  } = useBudgetApp();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recentTransactions = transactions.slice(0, 4);

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
              <h2 className={styles.summaryValue}>
                {formatCurrency(monthlySummary.accountTotalCents)}
              </h2>
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
            {monthlySummary.monthLabel} net: {formatCurrency(monthlySummary.netCents)} with{' '}
            {formatCurrency(monthlySummary.incomeCents)} in,{' '}
            {formatCurrency(monthlySummary.expenseCents)} out, and{' '}
            {formatCurrency(monthlySummary.adjustmentCents)} in adjustments.
          </p>
          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <span>Income</span>
              <strong>{formatCurrency(monthlySummary.incomeCents)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span>Expenses</span>
              <strong>{formatCurrency(monthlySummary.expenseCents)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span>Adjustments</span>
              <strong>{formatCurrency(monthlySummary.adjustmentCents)}</strong>
            </article>
          </div>
        </section>

        <section className={styles.accountList}>
          {accounts.map((account) => {
            const logo = account.logoPath ? assetUrls[account.logoPath] : undefined;

            return (
              <Link key={account.id} to={`/account/${account.id}`} className={styles.linkCard}>
                <motion.article
                  layoutId={`account-card-${account.id}`}
                  className={styles.accountCard}
                  whileTap={{ scale: 0.985 }}
                >
                  <motion.div layoutId={`account-logo-${account.id}`} className={styles.logoShell}>
                    {logo ? (
                      <img src={logo} alt={`${account.name} logo`} className={styles.logoImage} />
                    ) : (
                      <span>{account.name.slice(0, 1)}</span>
                    )}
                  </motion.div>

                  <div className={styles.accountMeta}>
                    <p className={styles.accountName}>{account.name}</p>
                    <p className={styles.accountHint}>
                      Opening balance {formatCurrency(account.openingBalanceCents)}
                    </p>
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

        <section className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <div>
              <p className={styles.summaryLabel}>Recent activity</p>
              <h3>Latest ledger entries</h3>
            </div>
            <span>{transactions.length}</span>
          </div>

          {recentTransactions.length === 0 ? (
            <p className={styles.emptyText}>Add your first transaction from any account card.</p>
          ) : (
            <div className={styles.activityList}>
              {recentTransactions.map((transaction) => {
                const account = accounts.find((entry) => entry.id === transaction.accountId);

                return (
                  <article key={transaction.id} className={styles.activityRow}>
                    <div>
                      <p className={styles.activityName}>{transaction.name}</p>
                      <p className={styles.activityMeta}>
                        {account?.name ?? 'Account'} • {transaction.date}
                      </p>
                    </div>
                    <strong className={styles.activityAmount}>
                      {transaction.type === 'expense' || transaction.type === 'transfer_out'
                        ? '-'
                        : '+'}
                      {formatCurrency(Math.abs(transaction.amountCents))}
                    </strong>
                  </article>
                );
              })}
            </div>
          )}
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
