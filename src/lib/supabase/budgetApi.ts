import type { Session } from '@supabase/supabase-js';
import type {
  Account,
  AddAccountInput,
  AddRecurringRuleInput,
  AddTransactionInput,
  AddTransferInput,
  AddWishlistInput,
  AuthUser,
  CompleteOnboardingInput,
  Profile,
  RecurringRule,
  SaveRoundingPreferencesInput,
  Transaction,
  WishlistItem
} from '../types';
import { createId } from '../utils/id';
import { resizeImageToDataUrl, dataUrlToBlob } from '../utils/image';
import {
  addCadence,
  deriveAccountBalance,
  listDueRecurringDates
} from '../utils/recurring';
import { DEFAULT_ROUNDING_MODE, normalizeAccountRoundingMode } from '../utils/money';
import { BUDGET_IMAGE_BUCKET } from './constants';
import { getSupabaseClient } from './client';

type ProfileRow = {
  id: string;
  email: string | null;
  rounding_default_mode: Profile['roundingDefaultMode'];
  created_at: string;
};

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  opening_balance_cents: number;
  logo_path: string | null;
  rounding_override_mode: string | null;
  sort_order: number;
  created_at: string;
};

type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  type: Transaction['type'];
  name: string;
  amount_cents: number;
  date: string;
  linked_transfer_id: string | null;
  recurring_rule_id: string | null;
  created_at: string;
};

type RecurringRuleRow = {
  id: string;
  user_id: string;
  account_id: string;
  type: RecurringRule['type'];
  name: string;
  amount_cents: number;
  cadence: RecurringRule['cadence'];
  start_date: string;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
};

type WishlistRow = {
  id: string;
  user_id: string;
  name: string;
  price_cents: number;
  url: string;
  image_path: string | null;
  created_at: string;
};

export type BudgetSnapshot = {
  user: AuthUser;
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  wishlistItems: WishlistItem[];
  assetUrls: Record<string, string>;
};

function requireData<T>(data: T | null, fallback: T): T {
  return data ?? fallback;
}

function mapAuthUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    roundingDefaultMode: row.rounding_default_mode ?? DEFAULT_ROUNDING_MODE,
    createdAt: row.created_at
  };
}

function mapAccount(row: AccountRow, balanceCents: number): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    openingBalanceCents: row.opening_balance_cents,
    balanceCents,
    logoPath: row.logo_path,
    roundingOverrideMode: normalizeAccountRoundingMode(row.rounding_override_mode),
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    type: row.type,
    name: row.name,
    amountCents: row.amount_cents,
    date: row.date,
    linkedTransferId: row.linked_transfer_id,
    recurringRuleId: row.recurring_rule_id,
    createdAt: row.created_at
  };
}

function mapRecurringRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    type: row.type,
    name: row.name,
    amountCents: row.amount_cents,
    cadence: row.cadence,
    startDate: row.start_date,
    nextRunDate: row.next_run_date,
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

function mapWishlistItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    priceCents: row.price_cents,
    imagePath: row.image_path,
    url: row.url,
    createdAt: row.created_at
  };
}

async function uploadImage(
  file: File,
  userId: string,
  folder: 'accounts' | 'wishlist'
): Promise<string> {
  const supabase = getSupabaseClient();
  const resizedImage = await resizeImageToDataUrl(file);
  const blob = await dataUrlToBlob(resizedImage.dataUrl);
  const extension = resizedImage.mimeType === 'image/png' ? 'png' : 'webp';
  const path = `${userId}/${folder}/${createId()}.${extension}`;
  const { error } = await supabase.storage.from(BUDGET_IMAGE_BUCKET).upload(path, blob, {
    contentType: resizedImage.mimeType,
    upsert: false
  });

  if (error) {
    throw error;
  }

  return path;
}

async function resolveSignedUrls(paths: Array<string | null>): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];

  if (uniquePaths.length === 0) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUDGET_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    requireData(data, []).flatMap((entry) =>
      entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []
    )
  );
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return mapAuthUser(data.session);
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void
) {
  const supabase = getSupabaseClient();

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapAuthUser(session));
  });
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw error;
  }
}

export async function ensureProfile(user: AuthUser): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw error;
  }
}

export async function updateProfileRoundingDefault(
  userId: string,
  roundingDefaultMode: Profile['roundingDefaultMode']
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({ rounding_default_mode: roundingDefaultMode })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export async function materializeDueRecurringTransactions(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lte('next_run_date', today)
    .order('next_run_date', { ascending: true });

  if (error) {
    throw error;
  }

  const rules = requireData(data, []) as RecurringRuleRow[];

  for (const rule of rules) {
    const dueDates = listDueRecurringDates(rule.next_run_date, rule.cadence, today);

    if (dueDates.length === 0) {
      continue;
    }

    const recurringTransactions = dueDates.map((date) => ({
      user_id: userId,
      account_id: rule.account_id,
      type: rule.type,
      name: rule.name,
      amount_cents: rule.amount_cents,
      date,
      linked_transfer_id: null,
      recurring_rule_id: rule.id
    }));

    const { error: transactionError } = await supabase.from('transactions').upsert(
      recurringTransactions,
      {
        onConflict: 'recurring_rule_id,date'
      }
    );

    if (transactionError) {
      throw transactionError;
    }

    const lastDueDate = dueDates[dueDates.length - 1];
    const { error: ruleError } = await supabase
      .from('recurring_rules')
      .update({ next_run_date: addCadence(lastDueDate, rule.cadence) })
      .eq('id', rule.id)
      .eq('user_id', userId);

    if (ruleError) {
      throw ruleError;
    }
  }
}

export async function fetchBudgetSnapshot(user: AuthUser): Promise<BudgetSnapshot> {
  const supabase = getSupabaseClient();
  await ensureProfile(user);
  await materializeDueRecurringTransactions(user.id);

  const [profileResult, accountsResult, transactionsResult, recurringRulesResult, wishlistResult] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('accounts').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', {
        ascending: false
      }),
      supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('next_run_date'),
      supabase.from('wants').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      })
    ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (accountsResult.error) {
    throw accountsResult.error;
  }

  if (transactionsResult.error) {
    throw transactionsResult.error;
  }

  if (recurringRulesResult.error) {
    throw recurringRulesResult.error;
  }

  if (wishlistResult.error) {
    throw wishlistResult.error;
  }

  const transactionRows = requireData(transactionsResult.data, []) as TransactionRow[];
  const transactions = transactionRows
    .map(mapTransaction)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });

  const accountRows = requireData(accountsResult.data, []) as AccountRow[];
  const accounts = accountRows.map((row) =>
    mapAccount(
      row,
      deriveAccountBalance(
        {
          id: row.id,
          openingBalanceCents: row.opening_balance_cents
        },
        transactions
      )
    )
  );

  const recurringRules = (requireData(recurringRulesResult.data, []) as RecurringRuleRow[]).map(
    mapRecurringRule
  );
  const wishlistItems = (requireData(wishlistResult.data, []) as WishlistRow[]).map(
    mapWishlistItem
  );
  const profile = profileResult.data
    ? mapProfile(profileResult.data as ProfileRow)
    : {
        id: user.id,
        email: user.email,
        roundingDefaultMode: DEFAULT_ROUNDING_MODE,
        createdAt: new Date().toISOString()
      };
  const assetUrls = await resolveSignedUrls([
    ...accounts.map((account) => account.logoPath),
    ...wishlistItems.map((item) => item.imagePath)
  ]);

  return {
    user,
    profile,
    accounts,
    transactions,
    recurringRules,
    wishlistItems,
    assetUrls
  };
}

export async function createAccount(userId: string, input: AddAccountInput): Promise<void> {
  await createAccounts(userId, [input]);
}

export async function createAccounts(userId: string, inputs: AddAccountInput[]): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: existingAccounts, error: existingAccountsError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId);

  if (existingAccountsError) {
    throw existingAccountsError;
  }

  const startingSortOrder = requireData(existingAccounts, []).length;
  const rows = [];

  for (const [index, input] of inputs.entries()) {
    const logoPath = input.logoFile ? await uploadImage(input.logoFile, userId, 'accounts') : null;
    rows.push({
      user_id: userId,
      name: input.name,
      opening_balance_cents: input.openingBalanceCents,
      logo_path: logoPath,
      rounding_override_mode: input.roundingOverrideMode,
      sort_order: startingSortOrder + index
    });
  }

  const { error } = await supabase.from('accounts').insert(rows);

  if (error) {
    throw error;
  }
}

export async function completeOnboarding(
  user: AuthUser,
  input: CompleteOnboardingInput
): Promise<void> {
  await ensureProfile(user);
  await createAccounts(user.id, input.accounts);
}

export async function saveRoundingPreferences(
  userId: string,
  input: SaveRoundingPreferencesInput
): Promise<void> {
  const supabase = getSupabaseClient();

  for (const override of input.accountOverrides) {
    const { error } = await supabase
      .from('accounts')
      .update({ rounding_override_mode: override.roundingOverrideMode })
      .eq('id', override.accountId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  for (const update of input.openingBalanceUpdates) {
    const { error } = await supabase
      .from('accounts')
      .update({ opening_balance_cents: update.openingBalanceCents })
      .eq('id', update.accountId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}

export async function createTransaction(input: AddTransactionInput, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    account_id: input.accountId,
    type: input.type,
    name: input.name,
    amount_cents: input.amountCents,
    date: input.date,
    linked_transfer_id: null,
    recurring_rule_id: null
  });

  if (error) {
    throw error;
  }
}

export async function createTransfer(input: AddTransferInput, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const transferOutId = createId();
  const transferInId = createId();
  const rows = [
    {
      id: transferOutId,
      user_id: userId,
      account_id: input.fromAccountId,
      type: 'transfer_out' as const,
      name: input.name,
      amount_cents: input.amountCents,
      date: input.date,
      linked_transfer_id: transferInId,
      recurring_rule_id: null
    },
    {
      id: transferInId,
      user_id: userId,
      account_id: input.toAccountId,
      type: 'transfer_in' as const,
      name: input.name,
      amount_cents: input.amountCents,
      date: input.date,
      linked_transfer_id: transferOutId,
      recurring_rule_id: null
    }
  ];
  const { error } = await supabase.from('transactions').insert(rows);

  if (error) {
    throw error;
  }
}

export async function deleteTransactions(
  userId: string,
  transactionIds: string[]
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .in('id', transactionIds);

  if (error) {
    throw error;
  }
}

export async function createRecurringRule(
  userId: string,
  input: AddRecurringRuleInput
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('recurring_rules').insert({
    user_id: userId,
    account_id: input.accountId,
    type: input.type,
    name: input.name,
    amount_cents: input.amountCents,
    cadence: input.cadence,
    start_date: input.startDate,
    next_run_date: input.startDate,
    is_active: true
  });

  if (error) {
    throw error;
  }
}

export async function updateRecurringRuleState(
  userId: string,
  ruleId: string,
  isActive: boolean
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('recurring_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function deleteRecurringRule(userId: string, ruleId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function createWishlistItem(
  userId: string,
  input: AddWishlistInput
): Promise<void> {
  const supabase = getSupabaseClient();
  const imagePath = input.imageFile
    ? await uploadImage(input.imageFile, userId, 'wishlist')
    : null;
  const { error } = await supabase.from('wants').insert({
    user_id: userId,
    name: input.name,
    price_cents: input.priceCents,
    url: input.url,
    image_path: imagePath
  });

  if (error) {
    throw error;
  }
}

export async function deleteWishlistItem(
  userId: string,
  wishlistItemId: string,
  imagePath: string | null
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('wants')
    .delete()
    .eq('id', wishlistItemId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  if (imagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUDGET_IMAGE_BUCKET)
      .remove([imagePath]);

    if (storageError) {
      throw storageError;
    }
  }
}
