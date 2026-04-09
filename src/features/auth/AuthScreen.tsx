import { useState, type FormEvent } from 'react';
import { useBudgetApp } from '../../app/state/BudgetAppContext';
import styles from './AuthScreen.module.css';

export function AuthScreen() {
  const { sendMagicLink, configurationError } = useBudgetApp();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!email.trim()) {
        throw new Error('Add your email to receive a magic link.');
      }

      setIsSubmitting(true);
      await sendMagicLink(email.trim());
      setSuccessMessage(`Magic link sent to ${email.trim()}. Open it on any device to sign in.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send the magic link right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div>
          <p className={styles.eyebrow}>Budget V2</p>
          <h1 className={styles.title}>Take your budget across devices.</h1>
        </div>

        <p className={styles.subtitle}>
          Sign in with a magic link and the same accounts, activity, recurring items, and wishlist
          will follow you everywhere.
        </p>

        {configurationError ? <p className={styles.error}>{configurationError}</p> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Sending link...' : 'Email me a magic link'}
          </button>
        </form>

        <p className={styles.helper}>
          Use the same email on your phone, tablet, or laptop and Supabase will restore the same
          budget data after you sign in.
        </p>
      </div>
    </div>
  );
}
