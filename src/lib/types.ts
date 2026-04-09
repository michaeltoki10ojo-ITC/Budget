export type RoundingMode = 'exact' | 'nearest_5' | 'nearest_10';
export type AccountRoundingMode = RoundingMode;

export type Profile = {
  id: string;
  email: string | null;
  roundingDefaultMode: RoundingMode;
  createdAt: string;
};

export type Account = {
  id: string;
  userId: string;
  name: string;
  openingBalanceCents: number;
  balanceCents: number;
  logoPath: string | null;
  roundingOverrideMode: AccountRoundingMode;
  sortOrder: number;
  createdAt: string;
};

export type TransactionType =
  | 'expense'
  | 'income'
  | 'adjustment'
  | 'transfer_out'
  | 'transfer_in';

export type Transaction = {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  name: string;
  amountCents: number;
  date: string;
  linkedTransferId: string | null;
  recurringRuleId: string | null;
  createdAt: string;
};

export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly';

export type RecurringRule = {
  id: string;
  userId: string;
  accountId: string;
  type: Extract<TransactionType, 'expense' | 'income' | 'adjustment'>;
  name: string;
  amountCents: number;
  cadence: RecurringCadence;
  startDate: string;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
};

export type WishlistItem = {
  id: string;
  userId: string;
  name: string;
  priceCents: number;
  imagePath: string | null;
  url: string;
  createdAt: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
};

export type MonthlySummary = {
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  adjustmentCents: number;
  netCents: number;
  accountTotalCents: number;
};

export type AddAccountInput = {
  name: string;
  openingBalanceCents: number;
  logoFile: File | null;
  roundingOverrideMode: AccountRoundingMode;
};

export type CompleteOnboardingInput = {
  accounts: AddAccountInput[];
};

export type AddTransactionInput = {
  accountId: string;
  type: Extract<TransactionType, 'expense' | 'income' | 'adjustment'>;
  name: string;
  date: string;
  amountCents: number;
};

export type AddWishlistInput = {
  name: string;
  priceCents: number;
  url: string;
  imageFile: File | null;
};

export type AddTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  name: string;
  date: string;
  amountCents: number;
};

export type AddRecurringRuleInput = {
  accountId: string;
  type: Extract<TransactionType, 'expense' | 'income' | 'adjustment'>;
  name: string;
  amountCents: number;
  cadence: RecurringCadence;
  startDate: string;
};

export type SaveRoundingPreferencesInput = {
  accountOverrides: Array<{
    accountId: string;
    roundingOverrideMode: AccountRoundingMode;
  }>;
  openingBalanceUpdates: Array<{
    accountId: string;
    openingBalanceCents: number;
  }>;
};
