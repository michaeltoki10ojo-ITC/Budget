import { useEffect, useState } from 'react';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import styles from './LockScreen.module.css';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function LockScreen() {
  const { unlock, resetApp } = useBudgetApp();
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function submitPin() {
      if (pin.length !== 4) {
        return;
      }

      setIsSubmitting(true);
      const unlocked = await unlock(pin);

      if (!unlocked) {
        setErrorMessage('Incorrect PIN. Try again.');
        setPin('');
      }

      setIsSubmitting(false);
    }

    void submitPin();
  }, [pin, unlock]);

  async function handleReset() {
    const confirmed = window.confirm(
      'Reset the app and clear all local data? This removes your accounts, expenses, wishlist items, and PIN.'
    );

    if (!confirmed) {
      return;
    }

    await resetApp();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Locked</p>
        <h2 className={styles.title}>Enter your 4-digit PIN</h2>
        <div className={styles.pinDots} aria-label={`PIN length ${pin.length}`}>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={pin.length > index ? `${styles.dot} ${styles.dotFilled}` : styles.dot}
            />
          ))}
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <div className={styles.keypad}>
          {KEYPAD.map((keyValue, index) =>
            keyValue ? (
              <button
                key={keyValue}
                type="button"
                className={styles.key}
                disabled={isSubmitting}
                onClick={() => {
                  setErrorMessage('');

                  if (keyValue === '⌫') {
                    setPin((currentPin) => currentPin.slice(0, -1));
                    return;
                  }

                  setPin((currentPin) =>
                    currentPin.length < 4 ? `${currentPin}${keyValue}` : currentPin
                  );
                }}
              >
                {keyValue}
              </button>
            ) : (
              <div key={`empty-${index}`} />
            )
          )}
        </div>

        <button type="button" className={styles.resetButton} onClick={() => void handleReset()}>
          Forgot PIN? Reset app
        </button>
      </div>
    </div>
  );
}
