import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  Account,
  AddAccountInput,
  AddRecurringRuleInput,
  AddTransactionInput,
  AddTransferInput,
  AddWishlistInput,
  AuthUser,
  CompleteOnboardingInput,
  MonthlySummary,
  Profile,
  RecurringRule,
  RoundingMode,
  SaveRoundingPreferencesInput,
  Transaction,
  WishlistItem
} from '../../lib/types';
import {
  completeOnboarding as completeOnboardingInSupabase,
  createAccount,
  createRecurringRule,
  createTransaction,
  createTransfer,
  createWishlistItem,
  deleteRecurringRule,
  deleteTransactions,
  deleteWishlistItem,
  fetchBudgetSnapshot,
  getSessionUser,
  saveRoundingPreferences as saveRoundingPreferencesInSupabase,
  sendMagicLink,
  signOut as signOutFromSupabase,
  subscribeToAuthChanges,
  updateRecurringRuleState
} from '../../lib/supabase/budgetApi';
import { DEFAULT_ROUNDING_MODE, resolveAccountRoundingMode } from '../../lib/utils/money';
import { todayInputValue } from '../../lib/utils/date';
import { buildMonthlySummary } from '../../lib/utils/recurring';

type BootStatus = 'loading' | 'signed_out' | 'onboarding' | 'ready';

type BudgetAppContextValue = {
  bootStatus: BootStatus;
  authUser: AuthUser | null;
  profile: Profile | null;
  roundingDefaultMode: RoundingMode;
  configurationError: string | null;
  accounts: Account[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  wishlistItems: WishlistItem[];
  assetUrls: Record<string, string>;
  monthlySummary: MonthlySummary;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppData: () => Promise<void>;
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  addAccount: (input: AddAccountInput) => Promise<void>;
  getAccountRoundingMode: (accountId: string) => RoundingMode;
  saveRoundingPreferences: (input: SaveRoundingPreferencesInput) => Promise<void>;
  addTransaction: (input: AddTransactionInput) => Promise<void>;
  quickAdjustBalance: (accountId: string, deltaCents: number) => Promise<void>;
  addTransfer: (input: AddTransferInput) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  addRecurringRule: (input: AddRecurringRuleInput) => Promise<void>;
  toggleRecurringRule: (ruleId: string, isActive: boolean) => Promise<void>;
  removeRecurringRule: (ruleId: string) => Promise<void>;
  addWishlistItem: (input: AddWishlistInput) => Promise<void>;
  removeWishlistItem: (wishlistItemId: string) => Promise<void>;
};

const BudgetAppContext = createContext<BudgetAppContextValue | undefined>(undefined);

function createEmptySummary(): MonthlySummary {
  const now = new Date();

  return {
    monthLabel: now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    }),
    incomeCents: 0,
    expenseCents: 0,
    adjustmentCents: 0,
    netCents: 0,
    accountTotalCents: 0
  };
}

export function BudgetAppProvider({ children }: { children: React.ReactNode }) {
  const [bootStatus, setBootStatus] = useState<BootStatus>('loading');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const authUserRef = useRef<AuthUser | null>(null);

  const monthlySummary = useMemo(
    () => buildMonthlySummary(accounts, transactions),
    [accounts, transactions]
  );

  function clearState() {
    setProfile(null);
    setAccounts([]);
    setTransactions([]);
    setRecurringRules([]);
    setWishlistItems([]);
    setAssetUrls({});
  }

  async function hydrateForUser(user: AuthUser) {
    const snapshot = await fetchBudgetSnapshot(user);

    authUserRef.current = snapshot.user;
    setAuthUser(snapshot.user);
    setProfile(snapshot.profile);
    setAccounts(snapshot.accounts);
    setTransactions(snapshot.transactions);
    setRecurringRules(snapshot.recurringRules);
    setWishlistItems(snapshot.wishlistItems);
    setAssetUrls(snapshot.assetUrls);
    setBootStatus(snapshot.accounts.length === 0 ? 'onboarding' : 'ready');
  }

  async function refreshAppData() {
    if (!authUserRef.current) {
      return;
    }

    await hydrateForUser(authUserRef.current);
  }

  async function runForUser(
    action: (user: AuthUser) => Promise<void>,
    refreshAfter = true
  ) {
    const user = authUserRef.current;

    if (!user) {
      throw new Error('Sign in to keep working with your budget.');
    }

    await action(user);

    if (refreshAfter) {
      await hydrateForUser(user);
    }
  }

  useEffect(() => {
    let isActive = true;
    let removeFocusListener = () => undefined;
    let unsubscribe = () => undefined;

    async function bootstrap() {
      try {
        const currentUser = await getSessionUser();

        if (!isActive) {
          return;
        }

        authUserRef.current = currentUser;
        setAuthUser(currentUser);

        if (currentUser) {
          await hydrateForUser(currentUser);
        } else {
          clearState();
          setBootStatus('signed_out');
        }

        const authSubscription = subscribeToAuthChanges((nextUser) => {
          authUserRef.current = nextUser;
          setAuthUser(nextUser);

          if (!nextUser) {
            clearState();
            setBootStatus('signed_out');
            return;
          }

          void hydrateForUser(nextUser);
        });

        unsubscribe = () => {
          authSubscription.data.subscription.unsubscribe();
        };

        const handleFocus = () => {
          if (authUserRef.current) {
            void hydrateForUser(authUserRef.current);
          }
        };

        window.addEventListener('focus', handleFocus);
        removeFocusListener = () => {
          window.removeEventListener('focus', handleFocus);
        };
      } catch (error) {
        if (!isActive) {
          return;
        }

        clearState();
        authUserRef.current = null;
        setAuthUser(null);
        setConfigurationError(
          error instanceof Error ? error.message : 'Unable to connect to Supabase.'
        );
        setBootStatus('signed_out');
      }
    }

    void bootstrap();

    return () => {
      isActive = false;
      unsubscribe();
      removeFocusListener();
    };
  }, []);

  async function handleSendMagicLink(email: string) {
    await sendMagicLink(email);
  }

  async function handleSignOut() {
    await signOutFromSupabase();
    authUserRef.current = null;
    setAuthUser(null);
    clearState();
    setBootStatus('signed_out');
  }

  async function handleCompleteOnboarding(input: CompleteOnboardingInput) {
    await runForUser((user) => completeOnboardingInSupabase(user, input));
  }

  async function addAccount(input: AddAccountInput) {
    await runForUser((user) => createAccount(user.id, input));
  }

  function getAccountRoundingMode(accountId: string): RoundingMode {
    const account = accounts.find((entry) => entry.id === accountId);

    return resolveAccountRoundingMode(
      profile?.roundingDefaultMode ?? DEFAULT_ROUNDING_MODE,
      account?.roundingOverrideMode
    );
  }

  async function saveRoundingPreferences(input: SaveRoundingPreferencesInput) {
    await runForUser((user) => saveRoundingPreferencesInSupabase(user.id, input));
  }

  async function addTransaction(input: AddTransactionInput) {
    await runForUser((user) => createTransaction(input, user.id));
  }

  async function quickAdjustBalance(accountId: string, deltaCents: number) {
    await runForUser((user) =>
      createTransaction(
        {
          accountId,
          type: 'adjustment',
          name: deltaCents >= 0 ? 'Quick cash-in' : 'Quick cash-out',
          amountCents: deltaCents,
          date: todayInputValue()
        },
        user.id
      )
    );
  }

  async function addTransfer(input: AddTransferInput) {
    await runForUser((user) => createTransfer(input, user.id));
  }

  async function deleteTransaction(transactionId: string) {
    const transaction = transactions.find((entry) => entry.id === transactionId);

    if (!transaction) {
      return;
    }

    if (transaction.recurringRuleId) {
      throw new Error('Delete or pause the recurring rule instead of removing this entry.');
    }

    const relatedIds = transaction.linkedTransferId
      ? [transaction.id, transaction.linkedTransferId]
      : [transaction.id];

    await runForUser((user) => deleteTransactions(user.id, relatedIds));
  }

  async function addRecurringRule(input: AddRecurringRuleInput) {
    await runForUser((user) => createRecurringRule(user.id, input));
  }

  async function toggleRecurringRule(ruleId: string, isActive: boolean) {
    await runForUser((user) => updateRecurringRuleState(user.id, ruleId, isActive));
  }

  async function removeRecurringRule(ruleId: string) {
    await runForUser((user) => deleteRecurringRule(user.id, ruleId));
  }

  async function addWishlistItem(input: AddWishlistInput) {
    await runForUser((user) => createWishlistItem(user.id, input));
  }

  async function removeWishlistItem(wishlistItemId: string) {
    const wishlistItem = wishlistItems.find((entry) => entry.id === wishlistItemId);

    if (!wishlistItem) {
      return;
    }

    await runForUser((user) =>
      deleteWishlistItem(user.id, wishlistItemId, wishlistItem.imagePath)
    );
  }

  return (
    <BudgetAppContext.Provider
      value={{
        bootStatus,
        authUser,
        profile,
        roundingDefaultMode: profile?.roundingDefaultMode ?? DEFAULT_ROUNDING_MODE,
        configurationError,
        accounts,
        transactions,
        recurringRules,
        wishlistItems,
        assetUrls,
        monthlySummary: accounts.length || transactions.length ? monthlySummary : createEmptySummary(),
        sendMagicLink: handleSendMagicLink,
        signOut: handleSignOut,
        refreshAppData,
        completeOnboarding: handleCompleteOnboarding,
        addAccount,
        getAccountRoundingMode,
        saveRoundingPreferences,
        addTransaction,
        quickAdjustBalance,
        addTransfer,
        deleteTransaction,
        addRecurringRule,
        toggleRecurringRule,
        removeRecurringRule,
        addWishlistItem,
        removeWishlistItem
      }}
    >
      {children}
    </BudgetAppContext.Provider>
  );
}

export function useBudgetApp() {
  const context = useContext(BudgetAppContext);

  if (!context) {
    throw new Error('useBudgetApp must be used within BudgetAppProvider.');
  }

  return context;
}
