import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';
import { BudgetAppProvider, useBudgetApp } from './state/BudgetAppContext';
import { AppShell } from './shell/AppShell';
import { HomePage } from '../features/home/HomePage';
import { AccountDetailPage } from '../features/accounts/AccountDetailPage';
import { WishlistPage } from '../features/wants/WantsPage';
import { AuthScreen } from '../features/auth/AuthScreen';
import { OnboardingPage } from '../features/setup/OnboardingPage';
import { RecurringPage } from '../features/recurring/RecurringPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import styles from './App.module.css';

function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashCard}>
        <p className={styles.splashEyebrow}>Budget V2</p>
        <h1>Connecting your synced budget...</h1>
      </div>
    </div>
  );
}

function AppContent() {
  const { bootStatus } = useBudgetApp();

  if (bootStatus === 'loading') {
    return <SplashScreen />;
  }

  if (bootStatus === 'signed_out') {
    return <AuthScreen />;
  }

  if (bootStatus === 'onboarding') {
    return <OnboardingPage />;
  }

  return (
    <div className={styles.frame}>
      <LayoutGroup id="budget-layout">
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/account/:accountId" element={<AccountDetailPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wants" element={<Navigate to="/wishlist" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LayoutGroup>
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
