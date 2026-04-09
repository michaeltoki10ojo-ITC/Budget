import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Account, AccountRoundingMode } from '../../lib/types';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import {
  buildAccountRoundingOptions,
  centsToInputValue,
  formatCurrency,
  getRoundingModeLabel,
  getInputFractionDigits,
  getSignedInputDirection,
  roundCurrencyInput
} from '../../lib/utils/money';
import styles from './SettingsPage.module.css';

type ReviewState = {
  value: string;
  note: string;
};

function buildOverrideMap(accounts: Account[]) {
  return Object.fromEntries(accounts.map((account) => [account.id, account.roundingOverrideMode]));
}

export function SettingsPage() {
  const { accounts, profile, saveRoundingPreferences } = useBudgetApp();
  const [draftOverrides, setDraftOverrides] = useState<Record<string, AccountRoundingMode>>(
    () => buildOverrideMap(accounts)
  );
  const [reviewInputs, setReviewInputs] = useState<Record<string, ReviewState>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const accountSettingsKey = useMemo(
    () =>
      accounts
        .map(
          (account) =>
            `${account.id}:${account.roundingOverrideMode}:${account.openingBalanceCents}`
        )
        .join('|'),
    [accounts]
  );

  useEffect(() => {
    setDraftOverrides(buildOverrideMap(accounts));
    setReviewInputs({});
  }, [accountSettingsKey]);

  const changedOverrideIds = useMemo(
    () =>
      accounts
        .filter((account) => (draftOverrides[account.id] ?? account.roundingOverrideMode) !== account.roundingOverrideMode)
        .map((account) => account.id),
    [accounts, draftOverrides]
  );

  const affectedAccounts = useMemo(
    () =>
      accounts.filter((account) => {
        const nextOverride = draftOverrides[account.id] ?? account.roundingOverrideMode;
        return nextOverride !== account.roundingOverrideMode;
      }),
    [accounts, draftOverrides]
  );

  const hasChanges = changedOverrideIds.length > 0 || affectedAccounts.some((account) => reviewInputs[account.id]?.value);

  function applyReviewBalance(accountId: string) {
    const account = accounts.find((entry) => entry.id === accountId);

    if (!account) {
      return;
    }

    const reviewInput = reviewInputs[accountId];
    const effectiveMode = draftOverrides[account.id] ?? account.roundingOverrideMode;
    const roundedInput = roundCurrencyInput(
      reviewInput?.value ?? '',
      effectiveMode,
      getSignedInputDirection(reviewInput?.value ?? '')
    );

    if (!roundedInput) {
      setReviewInputs((current) => ({
        ...current,
        [accountId]: {
          value: reviewInput?.value ?? '',
          note: ''
        }
      }));
      return;
    }

    setReviewInputs((current) => ({
      ...current,
      [accountId]: {
        value: centsToInputValue(
          roundedInput.roundedCents,
          getInputFractionDigits(effectiveMode)
        ),
        note: roundedInput.didRound
          ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.`
          : ''
      }
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!hasChanges) {
        setSuccessMessage('No settings changes to save yet.');
        return;
      }

      const openingBalanceUpdates = affectedAccounts.map((account) => {
        const review = reviewInputs[account.id];
        const effectiveMode = draftOverrides[account.id] ?? account.roundingOverrideMode;
        const roundedInput = roundCurrencyInput(
          review?.value ?? '',
          effectiveMode,
          getSignedInputDirection(review?.value ?? '')
        );

        if (!roundedInput) {
          throw new Error(`Re-enter the opening balance for ${account.name}.`);
        }

        return {
          accountId: account.id,
          openingBalanceCents: roundedInput.roundedCents
        };
      });

      setIsSaving(true);
      await saveRoundingPreferences({
        accountOverrides: accounts.map((account) => ({
          accountId: account.id,
          roundingOverrideMode: draftOverrides[account.id] ?? account.roundingOverrideMode
        })),
        openingBalanceUpdates
      });
      setSuccessMessage('Rounding settings saved. Historical transactions were left unchanged.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your rounding settings.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <p className={styles.eyebrow}>Settings</p>
        <h2>Choose how typed amounts should round.</h2>
        <p>
          Future typed amounts follow the rules below. Historical transactions stay exactly as they
          are.
        </p>
      </section>

      <form className={styles.settingsCard} onSubmit={handleSubmit}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Account rounding</p>
            <h3>Choose one real mode for each account</h3>
          </div>
          <button type="submit" className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
        </div>

        <div className={styles.accountList}>
          {accounts.map((account) => {
            const draftOverride = draftOverrides[account.id] ?? account.roundingOverrideMode;
            const requiresReview = affectedAccounts.some((entry) => entry.id === account.id);
            const review = reviewInputs[account.id];

            return (
              <article key={account.id} className={styles.accountCard}>
                <div className={styles.accountHeader}>
                  <div>
                    <h4>{account.name}</h4>
                    <p>
                      Current opening balance {formatCurrency(account.openingBalanceCents)}.
                    </p>
                  </div>
                  <span className={styles.accountModeTag}>{getRoundingModeLabel(draftOverride)}</span>
                </div>

                <label>
                  Account rounding
                  <select
                    value={draftOverride}
                    onChange={(event) =>
                      setDraftOverrides((current) => ({
                        ...current,
                        [account.id]: event.target.value as AccountRoundingMode
                      }))
                    }
                  >
                    {buildAccountRoundingOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {requiresReview ? (
                  <label>
                    Re-enter opening balance
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={review?.value ?? ''}
                      onChange={(event) =>
                        setReviewInputs((current) => ({
                          ...current,
                          [account.id]: {
                            value: event.target.value,
                            note: ''
                          }
                        }))
                      }
                      onBlur={() => applyReviewBalance(account.id)}
                      placeholder={centsToInputValue(
                        account.openingBalanceCents,
                        getInputFractionDigits(draftOverride)
                      )}
                    />
                    <small className={review?.note ? styles.roundedNote : styles.helperText}>
                      {review?.note || 'Re-enter the opening balance using the new mode you chose.'}
                    </small>
                  </label>
                ) : null}
              </article>
            );
          })}
        </div>

        {affectedAccounts.length > 0 ? (
          <div className={styles.warningCard}>
            <strong>Review required</strong>
            <p>
              Changing rounding affects future typed amounts. Re-enter opening balances for the
              highlighted accounts before saving.
            </p>
          </div>
        ) : null}

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {profile?.email ? <p className={styles.footerNote}>Signed in as {profile.email}</p> : null}
      </form>
    </div>
  );
}
