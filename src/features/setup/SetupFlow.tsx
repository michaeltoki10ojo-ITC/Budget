import { useState, type FormEvent } from 'react';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import { ensureFiveIncrement, isFiveIncrement, parseCurrencyInputToCents } from '../../lib/utils/money';
import { isValidPin } from '../../lib/utils/pin';
import type { SetupAccountInput } from '../../lib/types';
import { ACCOUNT_LOGO_OPTIONS, type PresetLogoOption } from './logoOptions';
import styles from './SetupFlow.module.css';

const STARTER_ACCOUNTS = ['Checking', 'Cash', 'Savings'];

type AccountSetupForm = {
  name: string;
  balance: string;
  logoFile: File | null;
  preview: string;
  selectedPresetId: string | null;
};

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to preview image.'));
    reader.readAsDataURL(file);
  });
}

async function presetToFile(preset: PresetLogoOption): Promise<File> {
  const response = await fetch(preset.src);
  const blob = await response.blob();
  const extension = preset.src.split('.').pop()?.split('?')[0] ?? 'png';

  return new File([blob], `${preset.id}.${extension}`, {
    type: blob.type || 'image/png'
  });
}

export function SetupFlow() {
  const { completeSetup } = useBudgetApp();
  const [step, setStep] = useState<'pin' | 'accounts'>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<AccountSetupForm[]>(
    STARTER_ACCOUNTS.map((name) => ({
      name,
      balance: '0',
      logoFile: null,
      preview: '',
      selectedPresetId: null
    }))
  );

  function handlePinContinue() {
    if (!isValidPin(pin)) {
      setErrorMessage('Choose a 4-digit PIN.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('PINs do not match.');
      return;
    }

    setErrorMessage('');
    setStep('accounts');
  }

  async function handleLogoChange(index: number, file: File | null) {
    if (!file) {
      setAccounts((currentAccounts) =>
        currentAccounts.map((account, currentIndex) =>
          currentIndex === index
            ? { ...account, logoFile: null, preview: '', selectedPresetId: null }
            : account
        )
      );
      return;
    }

    const preview = await readPreview(file);

    setAccounts((currentAccounts) =>
      currentAccounts.map((account, currentIndex) =>
        currentIndex === index
          ? { ...account, logoFile: file, preview, selectedPresetId: null }
          : account
      )
    );
  }

  async function handlePresetSelect(index: number, preset: PresetLogoOption) {
    const logoFile = await presetToFile(preset);

    setAccounts((currentAccounts) =>
      currentAccounts.map((account, currentIndex) =>
        currentIndex === index
          ? {
              ...account,
              logoFile,
              preview: preset.src,
              selectedPresetId: preset.id
            }
          : account
      )
    );
  }

  async function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const payload: SetupAccountInput[] = accounts.map((account) => {
        const balanceCents = parseCurrencyInputToCents(account.balance);

        if (balanceCents === null) {
          throw new Error(`Enter a starting balance for ${account.name}.`);
        }

        ensureFiveIncrement(balanceCents);

        if (!account.logoFile) {
          throw new Error(`Upload a logo for ${account.name}.`);
        }

        return {
          name: account.name,
          balanceCents,
          logoFile: account.logoFile
        };
      });

      setIsSubmitting(true);
      await completeSetup(pin, payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to finish setup right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>First-time setup</p>
        <h1 className={styles.title}>Make Budget yours.</h1>
        <p className={styles.subtitle}>
          Everything stays on this device. Set a PIN, add your starter balances, and choose a
          logo for each account from your built-in options or your own upload.
        </p>

        {step === 'pin' ? (
          <div className={styles.formStack}>
            <label>
              Create 4-digit PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
              />
            </label>

            <label>
              Confirm PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="1234"
              />
            </label>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

            <button type="button" className={styles.primaryButton} onClick={handlePinContinue}>
              Continue to accounts
            </button>
          </div>
        ) : (
          <form className={styles.formStack} onSubmit={handleSetupSubmit}>
            <div className={styles.accountGrid}>
              {accounts.map((account, index) => (
                <section key={account.name} className={styles.accountCard}>
                  <div className={styles.accountHeader}>
                    <div>
                      <h2>{account.name}</h2>
                      <p>{isFiveIncrement(parseCurrencyInputToCents(account.balance) ?? 0) ? 'Balance in $5 steps' : 'Needs a $5 increment'}</p>
                    </div>
                    <div className={styles.logoPreview}>
                      {account.preview ? (
                        <img src={account.preview} alt={`${account.name} preview`} />
                      ) : (
                        <span>{account.name.slice(0, 1)}</span>
                      )}
                    </div>
                  </div>

                  <label>
                    Starting balance
                    <input
                      type="number"
                      inputMode="decimal"
                      step={5}
                      value={account.balance}
                      onChange={(event) =>
                        setAccounts((currentAccounts) =>
                          currentAccounts.map((currentAccount, currentIndex) =>
                            currentIndex === index
                              ? { ...currentAccount, balance: event.target.value }
                              : currentAccount
                          )
                        )
                      }
                      placeholder="0"
                    />
                  </label>

                  <div className={styles.logoSection}>
                    <div className={styles.logoSectionHeader}>
                      <span>Pick account logo</span>
                      <small>Built-in picks from your account logo folder</small>
                    </div>

                    <div className={styles.logoOptionGrid}>
                      {ACCOUNT_LOGO_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={
                            account.selectedPresetId === option.id
                              ? `${styles.logoOptionButton} ${styles.logoOptionButtonSelected}`
                              : styles.logoOptionButton
                          }
                          onClick={() => void handlePresetSelect(index, option)}
                        >
                          <img src={option.src} alt={option.label} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>

                    <label className={styles.uploadLabel}>
                      Or upload your own
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          void handleLogoChange(index, event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                </section>
              ))}
            </div>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setErrorMessage('');
                  setStep('pin');
                }}
              >
                Back
              </button>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving budget...' : 'Finish setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
