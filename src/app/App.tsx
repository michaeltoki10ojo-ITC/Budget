import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';
import { BudgetAppProvider, useBudgetApp } from './state/BudgetAppContext';
import { SetupFlow } from '../features/setup/SetupFlow';
import { LockScreen } from '../features/lock/LockScreen';
import { AppShell } from './shell/AppShell';
import { HomePage } from '../features/home/HomePage';
import { AccountDetailPage } from '../features/accounts/AccountDetailPage';
import { WishlistPage } from '../features/wants/WantsPage';
import styles from './App.module.css';

function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashCard}>
        <p className={styles.splashEyebrow}>Budget PWA</p>
        <h1>Loading your local budget...</h1>
      </div>
    </div>
  );
}

function AppContent() {
  const { bootStatus } = useBudgetApp();

  if (bootStatus === 'loading') {
    return <SplashScreen />;
  }

  if (bootStatus === 'setup') {
    return <SetupFlow />;
  }

  return (
    <div className={styles.frame}>
      <LayoutGroup id="budget-layout">
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/account/:accountId" element={<AccountDetailPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/wants" element={<Navigate to="/wishlist" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LayoutGroup>
      {bootStatus === 'locked' ? <LockScreen /> : null}
    </div>
  );
}

export function App() {
  return (
    <BudgetAppProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </BudgetAppProvider>
  );
}
