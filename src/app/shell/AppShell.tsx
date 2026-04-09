import { NavLink, Outlet } from 'react-router-dom';
import { useBudgetApp } from '../state/BudgetAppContext';
import styles from './AppShell.module.css';

export function AppShell() {
  const { authUser, signOut } = useBudgetApp();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cloud-synced budgeting</p>
          <h1 className={styles.title}>Budget</h1>
          <p className={styles.userEmail}>{authUser?.email ?? 'Signed in'}</p>
        </div>
        <button type="button" className={styles.lockButton} onClick={() => void signOut()}>
          Sign out
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
          to="/recurring"
          className={({ isActive }) =>
            isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
          }
        >
          Recurring
        </NavLink>
        <NavLink
          to="/wishlist"
          className={({ isActive }) =>
            isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
          }
        >
          Wishlist
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
          }
        >
          Settings
        </NavLink>
      </nav>
    </div>
  );
}
