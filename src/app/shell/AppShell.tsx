import { NavLink, Outlet } from 'react-router-dom';
import { useBudgetApp } from '../state/BudgetAppContext';
import styles from './AppShell.module.css';

export function AppShell() {
  const { lock } = useBudgetApp();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Local-only budgeting</p>
          <h1 className={styles.title}>Budget</h1>
        </div>
        <button type="button" className={styles.lockButton} onClick={lock}>
          Lock
        </button>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav} aria-label="Primary">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/wishlist"
          className={({ isActive }) =>
            isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
          }
        >
          Wishlist
        </NavLink>
      </nav>
    </div>
  );
}
