import { useState, type FormEvent } from 'react';
import type { AddAccountInput } from '../../lib/types';
import {
  centsToInputValue,
  formatCurrency,
  roundCurrencyInputToFiveIncrement
} from '../../lib/utils/money';
import {
  ACCOUNT_LOGO_OPTIONS,
  presetLogoToFile,
  type PresetLogoOption
} from '../setup/logoOptions';
import styles from './AddAccountSheet.module.css';

type AddAccountSheetProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddAccountInput) => Promise<void>;
};

type NameMode = 'manual' | 'preset';

type PreviewState = {
  logoFile: File | null;
  preview: string;
  selectedPresetId: string | null;
};

function defaultPreviewState(): PreviewState {
  return {
    logoFile: null,
    preview: '',
    selectedPresetId: null
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
  const [nameMode, setNameMode] = useState<NameMode>('manual');
  const [balance, setBalance] = useState('0');
  const [balanceNote, setBalanceNote] = useState('');
  const [logoState, setLogoState] = useState<PreviewState>(defaultPreviewState);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  async function handlePresetSelect(preset: PresetLogoOption) {
    const logoFile = await presetLogoToFile(preset);
    setName(preset.label);
    setNameMode('preset');

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
    setName((currentName) => (nameMode === 'preset' ? '' : currentName));
    setNameMode('manual');
    setLogoState({
      logoFile: file,
      preview,
      selectedPresetId: null
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInputToFiveIncrement(balance, 'down');

      if (!name.trim()) {
        throw new Error('Add an account name.');
      }

      if (!roundedInput) {
        throw new Error('Add a starting balance.');
      }

      if (!logoState.logoFile) {
        throw new Error('Pick a logo or upload your own.');
      }

      setBalance(centsToInputValue(roundedInput.roundedCents, 0));
      setBalanceNote(
        roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
      );

      await onSubmit({
        name: name.trim(),
        balanceCents: roundedInput.roundedCents,
        logoFile: logoState.logoFile
      });

      setName('');
      setNameMode('manual');
      setBalance('0');
      setBalanceNote('');
      setLogoState(defaultPreviewState());
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account.');
    }
  }

  function applyRoundedBalance() {
    const roundedInput = roundCurrencyInputToFiveIncrement(balance, 'down');

    if (!roundedInput) {
      setBalanceNote('');
      return;
    }

    setBalance(centsToInputValue(roundedInput.roundedCents, 0));
    setBalanceNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
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
              onChange={(event) => {
                setName(event.target.value);
                setNameMode('manual');
              }}
              readOnly={Boolean(logoState.selectedPresetId)}
              placeholder="Savings jar"
            />
            <small className={styles.helperText}>
              {logoState.selectedPresetId
                ? 'Preset logos name this account automatically.'
                : 'If you upload your own image, choose the account name here.'}
            </small>
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
              {balanceNote || 'Incoming balances round down to the nearest $5.'}
            </small>
          </label>
        </div>

        <div className={styles.logoSection}>
          <div className={styles.logoHeader}>
            <span>Choose a logo</span>
            <small>Use one of your preset account logos or upload a custom image.</small>
          </div>

          <div className={styles.logoPreview}>
            {logoState.preview ? (
              <img src={logoState.preview} alt={`${name || 'Account'} preview`} />
            ) : (
              <span>{(name || 'A').slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className={styles.logoOptionGrid}>
            {ACCOUNT_LOGO_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  logoState.selectedPresetId === option.id
                    ? `${styles.logoOptionButton} ${styles.logoOptionButtonSelected}`
                    : styles.logoOptionButton
                }
                onClick={() => void handlePresetSelect(option)}
              >
                <img src={option.src} alt={option.label} />
                <span>{option.label}</span>
              </button>
            ))}
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
