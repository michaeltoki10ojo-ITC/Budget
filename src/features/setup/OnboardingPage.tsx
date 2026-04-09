import { useState, type FormEvent } from 'react';
import type { AccountRoundingMode, RoundingMode } from '../../lib/types';
import { createId } from '../../lib/utils/id';
import {
  buildAccountRoundingOptions,
  centsToInputValue,
  DEFAULT_ROUNDING_MODE,
  describeRoundingRule,
  formatCurrency,
  getInputFractionDigits,
  getSignedInputDirection,
  roundCurrencyInput,
  ROUNDING_MODE_OPTIONS
} from '../../lib/utils/money';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { ACCOUNT_LOGO_OPTIONS, presetLogoToFile } from './logoOptions';
import styles from './SetupFlow.module.css';

type DraftAccount = {
  id: string;
  name: string;
  balance: string;
  balanceNote: string;
  roundingOverrideMode: AccountRoundingMode;
  logoFile: File | null;
  preview: string;
  selectedPresetId: string;
};

function createDraftAccount(name: string): DraftAccount {
  return {
    id: createId(),
    name,
    balance: '0',
    balanceNote: '',
    roundingOverrideMode: DEFAULT_ROUNDING_MODE,
    logoFile: null,
    preview: '',
    selectedPresetId: ''
  };
}

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to preview image.'));
    reader.readAsDataURL(file);
  });
}

function getOpeningBalanceHelper(mode: RoundingMode, value: string): string {
  return `Opening balances ${describeRoundingRule(mode, getSignedInputDirection(value))}`;
}

export function OnboardingPage() {
  const { authUser, completeOnboarding, signOut } = useBudgetApp();
  const [draftAccounts, setDraftAccounts] = useState<DraftAccount[]>([
    createDraftAccount('Checking'),
    createDraftAccount('Savings')
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getEffectiveMode(account: DraftAccount) {
    return account.roundingOverrideMode;
  }

  function updateAccount(
    accountId: string,
    updater: (account: DraftAccount) => DraftAccount
  ) {
    setDraftAccounts((currentAccounts) =>
      currentAccounts.map((account) => (account.id === accountId ? updater(account) : account))
    );
  }

  function applyRoundedBalance(accountId: string) {
    setDraftAccounts((currentAccounts) =>
      currentAccounts.map((account) => {
        if (account.id !== accountId) {
          return account;
        }

        const effectiveMode = getEffectiveMode(account);
        const roundedInput = roundCurrencyInput(
          account.balance,
          effectiveMode,
          getSignedInputDirection(account.balance)
        );

        if (!roundedInput) {
          return { ...account, balanceNote: '' };
        }

        return {
          ...account,
          balance: centsToInputValue(
            roundedInput.roundedCents,
            getInputFractionDigits(effectiveMode)
          ),
          balanceNote: roundedInput.didRound
            ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.`
            : ''
        };
      })
    );
  }

  async function handlePresetChange(accountId: string, presetId: string) {
    if (!presetId) {
      updateAccount(accountId, (account) => ({
        ...account,
        logoFile: null,
        preview: '',
        selectedPresetId: ''
      }));
      return;
    }

    const option = ACCOUNT_LOGO_OPTIONS.find((entry) => entry.id === presetId);

    if (!option) {
      return;
    }

    const logoFile = await presetLogoToFile(option);

    updateAccount(accountId, (account) => ({
      ...account,
      name: option.label,
      logoFile,
      preview: option.src,
      selectedPresetId: option.id
    }));
  }

  async function handleLogoChange(accountId: string, file: File | null) {
    if (!file) {
      updateAccount(accountId, (account) => ({
        ...account,
        logoFile: null,
        preview: '',
        selectedPresetId: ''
      }));
      return;
    }

    const preview = await readPreview(file);
    updateAccount(accountId, (account) => ({
      ...account,
      logoFile: file,
      preview,
      selectedPresetId: ''
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const preparedAccounts = draftAccounts.map((account, index) => {
        const effectiveMode = getEffectiveMode(account);
        const roundedInput = roundCurrencyInput(
          account.balance,
          effectiveMode,
          getSignedInputDirection(account.balance)
        );

        if (!account.name.trim()) {
          throw new Error(`Add a name for account ${index + 1}.`);
        }

        if (!roundedInput) {
          throw new Error(`Add an opening balance for ${account.name || `account ${index + 1}`}.`);
        }

        return {
          name: account.name.trim(),
          openingBalanceCents: roundedInput.roundedCents,
          logoFile: account.logoFile,
          roundingOverrideMode: account.roundingOverrideMode
        };
      });

      setIsSubmitting(true);
      await completeOnboarding({ accounts: preparedAccounts });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to finish your account setup.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>First account setup</p>
        <h1 className={styles.title}>Set up your synced budget.</h1>
        <p className={styles.subtitle}>
          Signed in as {authUser?.email ?? 'your account'}. Start with two accounts, choose a
          rounding mode for each one, and add more if you need them.
        </p>

        <form className={styles.formStack} onSubmit={handleSubmit}>
          <section className={styles.accountSetupHeader}>
            <div>
              <h2>Your first accounts</h2>
              <p className={styles.accountSetupHint}>
                Pick how each account should round typed amounts from the start.
              </p>
            </div>

            <button
              type="button"
              className={styles.addAccountButton}
              onClick={() => setDraftAccounts((current) => [...current, createDraftAccount('')])}
            >
              Add account
            </button>
          </section>

          <section className={styles.accountGrid}>
            {draftAccounts.map((account, index) => {
              const effectiveMode = getEffectiveMode(account);

              return (
                <article key={account.id} className={styles.accountCard}>
                  <div className={styles.accountHeader}>
                    <div>
                      <h2>{account.name.trim() || `Account ${index + 1}`}</h2>
                      <p>
                        Rounds with{' '}
                        {ROUNDING_MODE_OPTIONS.find(
                          (option) => option.value === account.roundingOverrideMode
                        )?.label ?? 'Nearest $5'}
                        .
                      </p>
                    </div>

                    <div className={styles.logoPreview}>
                      {account.preview ? (
                        <img src={account.preview} alt={`${account.name || 'Account'} preview`} />
                      ) : (
                        <span>{(account.name.trim() || 'A').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  {draftAccounts.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeAccountButton}
                      onClick={() =>
                        setDraftAccounts((current) =>
                          current.length === 1
                            ? current
                            : current.filter((entry) => entry.id !== account.id)
                        )
                      }
                    >
                      Remove account
                    </button>
                  ) : null}

                  <label>
                    Account name
                    <input
                      value={account.name}
                      onChange={(event) =>
                        updateAccount(account.id, (current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label>
                    Opening balance
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={account.balance}
                      onChange={(event) =>
                        updateAccount(account.id, (current) => ({
                          ...current,
                          balance: event.target.value,
                          balanceNote: ''
                        }))
                      }
                      onBlur={() => applyRoundedBalance(account.id)}
                    />
                    <small className={account.balanceNote ? styles.roundedNote : styles.helperText}>
                      {account.balanceNote || getOpeningBalanceHelper(effectiveMode, account.balance)}
                    </small>
                  </label>

                  <label>
                    Account rounding
                    <select
                      value={account.roundingOverrideMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as AccountRoundingMode;
                        updateAccount(account.id, (current) => ({
                          ...current,
                          roundingOverrideMode: nextMode,
                          balanceNote: ''
                        }));
                      }}
                    >
                      {buildAccountRoundingOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.logoSection}>
                    <div className={styles.logoSectionHeader}>
                      <span>Logo or account type</span>
                      <small>Choose a preset or upload a custom image.</small>
                    </div>

                    <label>
                      Preset options
                      <select
                        value={account.selectedPresetId}
                        onChange={(event) =>
                          void handlePresetChange(account.id, event.target.value)
                        }
                      >
                        <option value="">No preset</option>
                        {ACCOUNT_LOGO_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.uploadLabel}>
                      Or upload your own
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          void handleLogoChange(account.id, event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </section>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Saving accounts...' : 'Start budgeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
