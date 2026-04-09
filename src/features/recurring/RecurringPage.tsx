import { useState, type FormEvent } from 'react';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { todayInputValue } from '../../lib/utils/date';
import type { RecurringCadence, RoundingMode } from '../../lib/types';
import {
  centsToInputValue,
  describeRoundingRule,
  formatCurrency,
  getInputFractionDigits,
  roundCurrencyInput
} from '../../lib/utils/money';
import { getRecurringRulePreview } from '../../lib/utils/recurring';
import styles from './RecurringPage.module.css';

const CADENCE_OPTIONS: RecurringCadence[] = ['weekly', 'biweekly', 'monthly'];
const TYPE_OPTIONS = ['expense', 'income', 'adjustment'] as const;

type RecurringEntryType = (typeof TYPE_OPTIONS)[number];

function getRecurringDirection(type: RecurringEntryType, value: string): 'down' | 'up' {
  return type === 'expense' || value.trim().startsWith('-') ? 'up' : 'down';
}

function getRecurringHelper(roundingMode: RoundingMode, type: RecurringEntryType): string {
  if (type === 'adjustment') {
    if (roundingMode === 'exact') {
      return 'Adjustments keep exact amounts.';
    }

    return `Positive adjustments ${describeRoundingRule(roundingMode, 'down')} Negative adjustments ${describeRoundingRule(roundingMode, 'up')}`;
  }

  return `Recurring ${type === 'expense' ? 'expenses' : 'income'} ${describeRoundingRule(
    roundingMode,
    type === 'expense' ? 'up' : 'down'
  )}`;
}

export function RecurringPage() {
  const {
    accounts,
    recurringRules,
    addRecurringRule,
    toggleRecurringRule,
    removeRecurringRule,
    getAccountRoundingMode
  } = useBudgetApp();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [type, setType] = useState<RecurringEntryType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('5');
  const [cadence, setCadence] = useState<RecurringCadence>('monthly');
  const [startDate, setStartDate] = useState(todayInputValue());
  const [amountNote, setAmountNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roundingMode = accountId ? getAccountRoundingMode(accountId) : 'nearest_5';

  function applyRoundedAmount() {
    const roundedInput = roundCurrencyInput(amount, roundingMode, getRecurringDirection(type, amount));

    if (!roundedInput) {
      setAmountNote('');
      return;
    }

    setAmount(centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(roundingMode)));
    setAmountNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInput(
        amount,
        roundingMode,
        getRecurringDirection(type, amount)
      );

      if (!accountId) {
        throw new Error('Choose an account for this recurring rule.');
      }

      if (!name.trim()) {
        throw new Error('Add a name for this recurring rule.');
      }

      if (!roundedInput || roundedInput.roundedCents === 0) {
        throw new Error('Add a valid recurring amount.');
      }

      setIsSubmitting(true);
      await addRecurringRule({
        accountId,
        type,
        name: name.trim(),
        amountCents:
          type === 'adjustment'
            ? roundedInput.roundedCents
            : Math.abs(roundedInput.roundedCents),
        cadence,
        startDate
      });
      setName('');
      setAmount('5');
      setAmountNote('');
      setCadence('monthly');
      setStartDate(todayInputValue());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this recurring rule.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <p className={styles.eyebrow}>Recurring</p>
        <h2>Automate the entries you expect every month.</h2>
        <p>
          Rules create ledger items when they become due, so the same rent, subscription, or
          paycheck shows up across all of your devices.
        </p>
      </section>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          <div>
            <p className={styles.eyebrow}>New rule</p>
            <h3>Create a repeating entry</h3>
          </div>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save rule'}
          </button>
        </div>

        <div className={styles.formGrid}>
          <label>
            Account
            <select
              value={accountId}
              onChange={(event) => {
                setAccountId(event.target.value);
                setAmountNote('');
              }}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as RecurringEntryType);
                setAmountNote('');
              }}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cadence
            <select
              value={cadence}
              onChange={(event) => setCadence(event.target.value as RecurringCadence)}
            >
              {CADENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rent"
            />
          </label>

          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
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
              onBlur={applyRoundedAmount}
              placeholder={type === 'adjustment' ? '-15 or 20' : '5'}
            />
          </label>
        </div>

        <p className={amountNote ? styles.roundedNote : styles.formHint}>
          {amountNote || getRecurringHelper(roundingMode, type)}
        </p>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      </form>

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <div>
            <p className={styles.eyebrow}>Active rules</p>
            <h3>{recurringRules.length ? 'Scheduled entries' : 'No recurring rules yet'}</h3>
          </div>
        </div>

        {recurringRules.length === 0 ? (
          <p className={styles.emptyText}>Create your first recurring item from the form above.</p>
        ) : (
          <div className={styles.ruleList}>
            {recurringRules.map((rule) => {
              const account = accounts.find((entry) => entry.id === rule.accountId);

              return (
                <article key={rule.id} className={styles.ruleCard}>
                  <div className={styles.ruleMeta}>
                    <div className={styles.ruleTopRow}>
                      <h4>{rule.name}</h4>
                      <span className={rule.isActive ? styles.activeBadge : styles.inactiveBadge}>
                        {rule.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p>
                      {account?.name ?? 'Account'} | {formatCurrency(Math.abs(rule.amountCents))} |{' '}
                      {getRecurringRulePreview(rule)}
                    </p>
                  </div>

                  <div className={styles.ruleActions}>
                    <button
                      type="button"
                      className={styles.toggleButton}
                      onClick={() => void toggleRecurringRule(rule.id, !rule.isActive)}
                    >
                      {rule.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => {
                        if (window.confirm(`Delete recurring rule "${rule.name}"?`)) {
                          void removeRecurringRule(rule.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
