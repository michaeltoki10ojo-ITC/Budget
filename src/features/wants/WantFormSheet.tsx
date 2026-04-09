import { useState, type FormEvent } from 'react';
import type { AddWishlistInput } from '../../lib/types';
import {
  centsToInputValue,
  describeRoundingRule,
  formatCurrency,
  getInputFractionDigits,
  roundCurrencyInput
} from '../../lib/utils/money';
import styles from './WantFormSheet.module.css';

const WISHLIST_ROUNDING_MODE = 'exact';

type WishlistFormSheetProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddWishlistInput) => Promise<void>;
};

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to preview image.'));
    reader.readAsDataURL(file);
  });
}

function normalizeUrl(value: string): string {
  const candidate =
    value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
  return new URL(candidate).toString();
}

export function WishlistFormSheet({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit
}: WishlistFormSheetProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  async function handleFileChange(file: File | null) {
    setImageFile(file);

    if (!file) {
      setPreview('');
      return;
    }

    setPreview(await readPreview(file));
  }

  function applyRoundedPrice() {
    const roundedInput = roundCurrencyInput(price, WISHLIST_ROUNDING_MODE, 'down');

    if (!roundedInput) {
      setPriceNote('');
      return;
    }

    setPrice(centsToInputValue(roundedInput.roundedCents, getInputFractionDigits(WISHLIST_ROUNDING_MODE)));
    setPriceNote(
      roundedInput.didRound ? `Rounded to ${formatCurrency(roundedInput.roundedCents)}.` : ''
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const roundedInput = roundCurrencyInput(price, WISHLIST_ROUNDING_MODE, 'down');

      if (!name.trim()) {
        throw new Error('Add a wishlist item name.');
      }

      if (!roundedInput || roundedInput.roundedCents <= 0) {
        throw new Error('Add a valid price.');
      }

      if (!url.trim()) {
        throw new Error('Add a link for this wishlist item.');
      }

      await onSubmit({
        name: name.trim(),
        priceCents: roundedInput.roundedCents,
        url: normalizeUrl(url.trim()),
        imageFile
      });

      setName('');
      setPrice('');
      setPriceNote('');
      setUrl('');
      setImageFile(null);
      setPreview('');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save wishlist item.');
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.sheet} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>New wishlist item</p>
            <h2>Add something you're saving for.</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.formGrid}>
          <label>
            Item name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New headphones"
            />
          </label>

          <label>
            Price
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                setPriceNote('');
              }}
              onBlur={applyRoundedPrice}
              placeholder="129.99"
            />
          </label>

          <label>
            Link
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="store.example.com/item"
            />
          </label>

          <label>
            Image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <p className={priceNote ? styles.roundedNote : styles.formHint}>
          {priceNote || `Wishlist prices ${describeRoundingRule(WISHLIST_ROUNDING_MODE, 'down')}`}
        </p>

        <div className={styles.previewCard}>
          {preview ? (
            <img src={preview} alt="Wishlist preview" />
          ) : (
            <span>Image preview appears here</span>
          )}
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Saving item...' : 'Save item'}
        </button>
      </form>
    </div>
  );
}
