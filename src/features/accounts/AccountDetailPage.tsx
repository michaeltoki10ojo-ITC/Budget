import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import type { RoundingMode, Transaction } from '../../lib/types';
import { formatDate, todayInputValue } from '../../lib/utils/date';
import {
  centsToInputValue,
  describeRoundingRule,
  formatCurrency,
  getInputFractionDigits,
  roundCurrencyInput
} from '../../lib/utils/money';
import styles from './AccountDetailPage.module.css';

const QUICK_ACTIONS = [
  { label: '+5', deltaCents: 500 },
  { label: '+10', deltaCents: 1000 },
  { label: '+20', deltaCents: 2000 },
  { label: '-5', deltaCents: -500 },
  { label: '-10', deltaCents: -1000 },
  { label: '-20', deltaCents: -2000 }
] as const;

const SUGGESTED_LABELS = [
  'Groceries',
  'Paycheck',
  'Dining out',
  'Subscription',
  'Gas',
  'Refund',
  'Correction'
];

type EntryMode = 'expense' | 'income' | 'adjustment';

function formatTransactionAmount(transaction: Transaction): string {
  const sign =
    transaction.type === 'expense' || transaction.type === 'transfer_out'
      ? '-'
      : transaction.type === 'adjustment' && transaction.amountCents < 0
        ? '-'
        : '+';

  return `${sign}${formatCurrency(Math.abs(transaction.amountCents))}`;
}

function getEntryDirection(mode: EntryMode, value: string): 'down' | 'up' {
  return mode === 'expense' || value.trim().startsWith('-') ? 'up' : 'down';
}

function getEntryHelperText(roundingMode: RoundingMode, entryMode: EntryMode): string {
  if (entryMode === 'adjustment') {
    if (roundingMode === 'exact') {
      return 'Adjustments keep exact amounts.';
    }

    return `Positive adjustments ${describeRoundingRule(roundingMode, 'down')} Negative adjustments ${describeRoundingRule(roundingMode, 'up')}`;
  }

  return `${
    entryMode === 'expense' ? 'Expense amounts' : 'Income amounts'
  } ${describeRoundingRule(roundingMode, entryMode === 'expense' ? 'up' : 'down')}`;
}

function getTransferHelperText(roundingMode: RoundingMode): string {
  return `Transfers ${describeRoundingRule(roundingMode, 'up')}`;
}

export function AccountDetailPage() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const {
    accounts,
    assetUrls,
    transactions,
    quickAdjustBalance,
    addTransaction,
    addTransfer,
    deleteTransaction,
    getAccountRoundingMode
  } = useBudgetApp();
  const account = accounts.find((entry) => entry.id === accountId);
  const transferTargets = accounts.filter((entry) => entry.id !== accountId);
  const [entryMode, setEntryMode] = useState<EntryMode>('expense');
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [amount, setAmount] = useState('5');
  const [amountNote, setAmountNote] = useState('');
  const [transferTargetId, setTransferTargetId] = useState(transferTargets[0]?.id ?? '');
  const [transferName, setTransferName] = useState('');
  const [transferAmount, setTransferAmount] = useState('5');
  const [transferNote, setTransferNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSavingTransfer, setIsSavingTransfer] = useState(false);

  const accountTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.accountId === accountId),
    [accountId, transactions]
  );

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
  const logo = activeAccount.logoPath ? assetUrls[activeAccount.logoPath] : undefined;
  const roundingMode = getAccountRoundingMode(activeAccount.id);

  function applyRoundedEntryAmount() {
    const roundedInput = roundCurrencyInput(
      amount,
      roundingMode,
      getEntryDirection(entryMode, amount)
    );

    if (!roundedInput) {
      setAmountNote('');
      return;
    }

    setAmount(centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(roundingMode)));
    setAmountNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  function applyRoundedTransferAmount() {
    const roundedInput = roundCurrencyInput(transferAmount, roundingMode, 'up');

    if (!roundedInput) {
      setTransferNote('');
      return;
    }

    setTransferAmount(
      centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(roundingMode))
    );
    setTransferNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInput(
        amount,
        roundingMode,
        getEntryDirection(entryMode, amount)
      );

      if (!name.trim()) {
        throw new Error('Add a name for this entry.');
      }

      if (!roundedInput || roundedInput.roundedCents === 0) {
        throw new Error('Add a valid amount.');
      }

      const normalizedAmount =
        entryMode === 'adjustment'
          ? roundedInput.roundedCents
          : Math.abs(roundedInput.roundedCents);

      setIsSavingEntry(true);
      await addTransaction({
        accountId: activeAccount.id,
        type: entryMode,
        name: name.trim(),
        amountCents: normalizedAmount,
        date
      });
      setName('');
      setAmount('5');
      setAmountNote('');
      setDate(todayInputValue());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this entry right now.'
      );
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInput(transferAmount, roundingMode, 'up');
      const targetAccount = accounts.find((entry) => entry.id === transferTargetId);

      if (!targetAccount) {
        throw new Error('Pick a destination account.');
      }

      if (!roundedInput || roundedInput.roundedCents <= 0) {
        throw new Error('Add a transfer amount.');
      }

      setIsSavingTransfer(true);
      await addTransfer({
        fromAccountId: activeAccount.id,
        toAccountId: targetAccount.id,
        name: transferName.trim() || `Transfer to ${targetAccount.name}`,
        amountCents: roundedInput.roundedCents,
        date
      });
      setTransferAmount('5');
      setTransferName('');
      setTransferNote('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this transfer right now.'
      );
    } finally {
      setIsSavingTransfer(false);
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
              <img src={logo} alt={`${activeAccount.name} logo`} />
            ) : (
              <span>{activeAccount.name[0]}</span>
            )}
          </motion.div>
          <div className={styles.headerMeta}>
            <p className={styles.headerLabel}>Ledger balance</p>
            <h2 className={styles.headerTitle}>{activeAccount.name}</h2>
            <p className={styles.headerHint}>
              Opening {formatCurrency(activeAccount.openingBalanceCents)} •{' '}
              {accountTransactions.length} entries
            </p>
          </div>
          <motion.p layoutId={`account-balance-${activeAccount.id}`} className={styles.balanceValue}>
            {formatCurrency(activeAccount.balanceCents)}
          </motion.p>
        </div>
      </motion.section>

      <section className={styles.adjustCard}>
        <p className={styles.sectionLabel}>Quick adjustments</p>
        <div className={styles.adjustGrid}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.deltaCents > 0 ? styles.adjustPositive : styles.adjustNegative}
              onClick={() => void quickAdjustBalance(activeAccount.id, action.deltaCents)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <form className={styles.entryForm} onSubmit={handleEntrySubmit}>
        <div className={styles.formHeader}>
          <div>
            <p className={styles.sectionLabel}>New entry</p>
            <h3>Add income, expenses, or manual adjustments.</h3>
          </div>
          <button type="submit" className={styles.primaryButton} disabled={isSavingEntry}>
            {isSavingEntry ? 'Saving...' : 'Save entry'}
          </button>
        </div>

        <div className={styles.modeSelector}>
          {(['expense', 'income', 'adjustment'] as EntryMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                entryMode === mode
                  ? `${styles.modeChip} ${styles.modeChipActive}`
                  : styles.modeChip
              }
              onClick={() => setEntryMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className={styles.formGrid}>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={entryMode === 'income' ? 'Paycheck' : 'Groceries'}
            />
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <label>
            Amount
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setAmountNote('');
              }}
              onBlur={applyRoundedEntryAmount}
              placeholder={entryMode === 'adjustment' ? '-15 or 20' : '5'}
            />
            <small className={amountNote ? styles.roundedNote : styles.helperText}>
              {amountNote || getEntryHelperText(roundingMode, entryMode)}
            </small>
          </label>
        </div>

        <div className={styles.suggestionGrid}>
          {SUGGESTED_LABELS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={
                name === suggestion
                  ? `${styles.suggestionChip} ${styles.suggestionChipActive}`
                  : styles.suggestionChip
              }
              onClick={() => setName(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      <form className={styles.transferForm} onSubmit={handleTransferSubmit}>
        <div className={styles.formHeader}>
          <div>
            <p className={styles.sectionLabel}>Transfer</p>
            <h3>Move money between your synced accounts.</h3>
          </div>
          <button
            type="submit"
            className={styles.secondaryButton}
            disabled={isSavingTransfer || transferTargets.length === 0}
          >
            {isSavingTransfer ? 'Moving...' : 'Transfer'}
          </button>
        </div>

        {transferTargets.length === 0 ? (
          <p className={styles.helperText}>
            Add a second account from the home screen before using transfers.
          </p>
        ) : (
          <div className={styles.transferGrid}>
            <label>
              To account
              <select
                value={transferTargetId}
                onChange={(event) => setTransferTargetId(event.target.value)}
              >
                {transferTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Transfer name
              <input
                value={transferName}
                onChange={(event) => setTransferName(event.target.value)}
                placeholder="Move to savings"
              />
            </label>

            <label>
              Amount
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={transferAmount}
                onChange={(event) => {
                  setTransferAmount(event.target.value);
                  setTransferNote('');
                }}
                onBlur={applyRoundedTransferAmount}
                placeholder="5"
              />
              <small className={transferNote ? styles.roundedNote : styles.helperText}>
                {transferNote || getTransferHelperText(roundingMode)}
              </small>
            </label>
          </div>
        )}

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      </form>

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <div>
            <p className={styles.sectionLabel}>Activity</p>
            <h3>Ledger history</h3>
          </div>
          <span className={styles.entryCount}>{accountTransactions.length}</span>
        </div>

        {accountTransactions.length === 0 ? (
          <div className={styles.emptyList}>
            <p>No activity yet.</p>
            <span>Add your first entry or transfer from the forms above.</span>
          </div>
        ) : (
          <div className={styles.entryScroller}>
            {accountTransactions.map((transaction) => (
              <article key={transaction.id} className={styles.entryRow}>
                <div className={styles.entryMeta}>
                  <div className={styles.entryTopRow}>
                    <p className={styles.entryName}>{transaction.name}</p>
                    <span className={styles.entryBadge}>{transaction.type.replace('_', ' ')}</span>
                  </div>
                  <p className={styles.entryDate}>{formatDate(transaction.date)}</p>
                  {transaction.recurringRuleId ? (
                    <p className={styles.recurringHint}>Managed by a recurring rule</p>
                  ) : null}
                </div>

                <div className={styles.entryActions}>
                  <strong className={styles.entryAmount}>
                    {formatTransactionAmount(transaction)}
                  </strong>
                  {!transaction.recurringRuleId ? (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm(`Delete "${transaction.name}"?`)) {
                          void deleteTransaction(transaction.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
