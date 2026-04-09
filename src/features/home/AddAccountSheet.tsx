import { useState, type FormEvent } from 'react';
import type { AccountRoundingMode, AddAccountInput } from '../../lib/types';
import {
  buildAccountRoundingOptions,
  centsToInputValue,
  DEFAULT_ROUNDING_MODE,
  describeRoundingRule,
  formatCurrency,
  getInputFractionDigits,
  getSignedInputDirection,
  roundCurrencyInput
} from '../../lib/utils/money';
import { ACCOUNT_LOGO_OPTIONS, presetLogoToFile } from '../setup/logoOptions';
import styles from './AddAccountSheet.module.css';

type AddAccountSheetProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddAccountInput) => Promise<void>;
};

type PreviewState = {
  logoFile: File | null;
  preview: string;
  selectedPresetId: string;
};

function defaultPreviewState(): PreviewState {
  return {
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

export function AddAccountSheet({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit
}: AddAccountSheetProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [balanceNote, setBalanceNote] = useState('');
  const [roundingOverrideMode, setRoundingOverrideMode] =
    useState<AccountRoundingMode>(DEFAULT_ROUNDING_MODE);
  const [logoState, setLogoState] = useState<PreviewState>(defaultPreviewState);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  const effectiveMode = roundingOverrideMode;

  async function handlePresetChange(presetId: string) {
    if (!presetId) {
      setLogoState(defaultPreviewState());
      return;
    }

    const preset = ACCOUNT_LOGO_OPTIONS.find((option) => option.id === presetId);

    if (!preset) {
      return;
    }

    const logoFile = await presetLogoToFile(preset);
    setName(preset.label);
    setLogoState({
      logoFile,
      preview: preset.src,
      selectedPresetId: preset.id
    });
  }

  async function handleLogoChange(file: File | null) {
    if (!file) {
      setLogoState(defaultPreviewState());
      return;
    }

    const preview = await readPreview(file);
    setLogoState({
      logoFile: file,
      preview,
      selectedPresetId: ''
    });
  }

  function applyRoundedBalance() {
    const roundedInput = roundCurrencyInput(
      balance,
      effectiveMode,
      getSignedInputDirection(balance)
    );

    if (!roundedInput) {
      setBalanceNote('');
      return;
    }

    setBalance(centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(effectiveMode)));
    setBalanceNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInput(
        balance,
        effectiveMode,
        getSignedInputDirection(balance)
      );

      if (!name.trim()) {
        throw new Error('Add an account name.');
      }

      if (!roundedInput) {
        throw new Error('Add a starting balance.');
      }

      setBalance(centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(effectiveMode)));
      setBalanceNote(
        roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
      );

      await onSubmit({
        name: name.trim(),
        openingBalanceCents: roundedInput.roundedCents,
        logoFile: logoState.logoFile,
        roundingOverrideMode
      });

      setName('');
      setBalance('0');
      setBalanceNote('');
      setRoundingOverrideMode(DEFAULT_ROUNDING_MODE);
      setLogoState(defaultPreviewState());
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account.');
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>New account</p>
            <h2>Add another account to your budget.</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.formGrid}>
          <label>
            Account name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Savings jar"
            />
            <small className={styles.helperSpacer} aria-hidden="true" />
          </label>

          <label>
            Starting balance
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={balance}
              onChange={(event) => {
                setBalance(event.target.value);
                setBalanceNote('');
              }}
              onBlur={applyRoundedBalance}
              placeholder="0"
            />
            <small className={balanceNote ? styles.roundedNote : styles.helperText}>
              {balanceNote || `Starting balances ${describeRoundingRule(effectiveMode, getSignedInputDirection(balance))}`}
            </small>
          </label>

          <label>
            Account rounding
            <select
              value={roundingOverrideMode}
              onChange={(event) => {
                setRoundingOverrideMode(event.target.value as AccountRoundingMode);
                setBalanceNote('');
              }}
            >
              {buildAccountRoundingOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className={styles.helperSpacerTall} aria-hidden="true" />
          </label>

          <label>
            Logo or account type
            <select
              value={logoState.selectedPresetId}
              onChange={(event) => void handlePresetChange(event.target.value)}
            >
              <option value="">No preset</option>
              {ACCOUNT_LOGO_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className={styles.helperText}>
              Presets give you a quick starting point and you can still rename the account.
            </small>
          </label>
        </div>

        <div className={styles.logoSection}>
          <div className={styles.logoHeader}>
            <span>Choose a logo</span>
            <small>Use a preset, upload your own, or skip this for now.</small>
          </div>

          <div className={styles.logoPreview}>
            {logoState.preview ? (
              <img src={logoState.preview} alt={`${name || 'Account'} preview`} />
            ) : (
              <span>{(name || 'A').slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <label>
            Or upload your own
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void handleLogoChange(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Saving account...' : 'Add account'}
        </button>
      </form>
    </div>
  );
}
