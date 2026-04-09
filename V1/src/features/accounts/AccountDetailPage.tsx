import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { formatDate, todayInputValue } from '../../lib/utils/date';
import {
  centsToInputValue,
  formatCurrency,
  roundCurrencyInputToFiveIncrement
} from '../../lib/utils/money';
import styles from './AccountDetailPage.module.css';

const QUICK_ACTIONS = [
  { label: '+5', deltaCents: 500 },
  { label: '+10', deltaCents: 1000 },
  { label: '+20', deltaCents: 2000 },
  { label: '-5', deltaCents: -500 },
  { label: '-10', deltaCents: -1000 },
  { label: '-20', deltaCents: -2000 }
];

const SUGGESTED_EXPENSES = [
  'Groceries',
  'Gas',
  'Dining out',
  'Coffee',
  'Shopping',
  'Phone bill',
  'Subscription',
  'Transfer'
];

export function AccountDetailPage() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { accounts, assets, expenses, quickAdjustBalance, addExpense, deleteExpense } =
    useBudgetApp();
  const account = accounts.find((entry) => entry.id === accountId);
  const [name, setName] = useState('');
  const [dateISO, setDateISO] = useState(todayInputValue());
  const [amount, setAmount] = useState('5');
  const [amountNote, setAmountNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!account) {
    return (
      <div className={styles.emptyState}>
        <h2>Account not found</h2>
        <p>The account you opened is no longer available.</p>
        <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
          Back home
        </button>
      </div>
    );
  }

  const activeAccount = account;
  const logo = assets[activeAccount.logoAssetId];
  const accountExpenses = expenses.filter((expense) => expense.accountId === activeAccount.id);

  function applyRoundedExpenseAmount() {
    const roundedInput = roundCurrencyInputToFiveIncrement(amount, 'up');

    if (!roundedInput) {
      setAmountNote('');
      return;
    }

    setAmount(centsToInputValue(roundedInput.roundedCents, 0));
    setAmountNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInputToFiveIncrement(amount, 'up');

      if (!name.trim()) {
        throw new Error('Add an expense name.');
      }

      if (!roundedInput || roundedInput.roundedCents <= 0) {
        throw new Error('Add an expense amount.');
      }

      setAmount(centsToInputValue(roundedInput.roundedCents, 0));
      setAmountNote(
        roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
      );

      setIsSubmitting(true);
      await addExpense({
        accountId: activeAccount.id,
        name: name.trim(),
        dateISO,
        amountCents: roundedInput.roundedCents
      });
      setName('');
      setAmount('5');
      setAmountNote('');
      setDateISO(todayInputValue());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this expense right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
        Back
      </button>

      <motion.section layoutId={`account-card-${activeAccount.id}`} className={styles.headerCard}>
        <div className={styles.headerRow}>
          <motion.div layoutId={`account-logo-${activeAccount.id}`} className={styles.logoShell}>
            {logo ? (
              <img src={logo.dataUrl} alt={`${activeAccount.name} logo`} />
            ) : (
              <span>{activeAccount.name[0]}</span>
            )}
          </motion.div>
          <div className={styles.headerMeta}>
            <p className={styles.headerLabel}>Account balance</p>
            <h2 className={styles.headerTitle}>{activeAccount.name}</h2>
          </div>
          <motion.p
            layoutId={`account-balance-${activeAccount.id}`}
            className={styles.balanceValue}
          >
            {formatCurrency(activeAccount.balanceCents)}
          </motion.p>
        </div>
      </motion.section>

      <section className={styles.adjustCard}>
        <p className={styles.sectionLabel}>Quick balance changes</p>
        <div className={styles.adjustGrid}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.deltaCents > 0 ? styles.adjustPositive : styles.adjustNegative
              }
              onClick={() => void quickAdjustBalance(activeAccount.id, action.deltaCents)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <form className={styles.expenseForm} onSubmit={handleExpenseSubmit}>
        <div className={styles.formHeader}>
          <div>
            <p className={styles.sectionLabel}>Add expense</p>
            <h3>Track what changed this account.</h3>
          </div>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add expense'}
          </button>
        </div>

        <div className={styles.formGrid}>
          <label>
            Expense name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Groceries"
            />
          </label>

          <label>
            Date
            <input type="date" value={dateISO} onChange={(event) => setDateISO(event.target.value)} />
          </label>

          <label>
            Amount
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setAmountNote('');
              }}
              onBlur={applyRoundedExpenseAmount}
              placeholder="5"
            />
            <small className={amountNote ? styles.roundedNote : styles.helperText}>
              {amountNote || 'Outgoing amounts round up to the nearest $5.'}
            </small>
          </label>
        </div>

        <div className={styles.suggestionBlock}>
          <div className={styles.suggestionHeader}>
            <p className={styles.sectionLabel}>Suggested expenses</p>
            <span>Tap one to fill the name quickly</span>
          </div>
          <div className={styles.suggestionGrid}>
            {SUGGESTED_EXPENSES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={
                  name === suggestion
                    ? `${styles.suggestionChip} ${styles.suggestionChipActive}`
                    : styles.suggestionChip
                }
                onClick={() => {
                  setName(suggestion);

                  if (!amount.trim()) {
                    setAmount('5');
                  }
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      </form>

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <div>
            <p className={styles.sectionLabel}>Expenses</p>
            <h3>Recent activity</h3>
          </div>
          <span className={styles.expenseCount}>{accountExpenses.length}</span>
        </div>

        {accountExpenses.length === 0 ? (
          <div className={styles.emptyList}>
            <p>No expenses yet.</p>
            <span>Use the form above to create your first entry.</span>
          </div>
        ) : (
          <div className={styles.expenseScroller}>
            {accountExpenses.map((expense) => (
              <article key={expense.id} className={styles.expenseRow}>
                <div>
                  <p className={styles.expenseName}>{expense.name}</p>
                  <p className={styles.expenseDate}>{formatDate(expense.dateISO)}</p>
                </div>
                <div className={styles.expenseActions}>
                  <strong className={styles.expenseAmount}>-{formatCurrency(expense.amountCents)}</strong>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => {
                      if (window.confirm(`Delete "${expense.name}"?`)) {
                        void deleteExpense(expense.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
