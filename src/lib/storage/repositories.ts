import type {
  Account,
  AddAccountInput,
  AddExpenseInput,
  AddWishlistInput,
  AppSettings,
  AssetRecord,
  Expense,
  WishlistItem
} from '../types';
import { getBudgetDb, resetBudgetDb } from './db';
import { createId } from '../utils/id';
import { ensureFiveIncrement } from '../utils/money';

const SETTINGS_STORAGE_KEY = 'budget-pwa-settings';

function sortAccounts(accounts: Account[]) {
  return [...accounts].sort((left, right) => left.sortOrder - right.sortOrder);
}

function sortExpenses(expenses: Expense[]) {
  return [...expenses].sort((left, right) => {
    if (left.dateISO !== right.dateISO) {
      return right.dateISO.localeCompare(left.dateISO);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortWishlistItems(wishlistItems: WishlistItem[]) {
  return [...wishlistItems].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export const settingsRepo = {
  get(): AppSettings | null {
    const rawValue = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as AppSettings;
  },

  save(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  },

  reset(): void {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
};

export const assetsRepo = {
  async listAll(): Promise<AssetRecord[]> {
    const db = await getBudgetDb();
    return db.getAll('assets');
  },

  async get(id: string): Promise<AssetRecord | undefined> {
    const db = await getBudgetDb();
    return db.get('assets', id);
  },

  async save(input: Omit<AssetRecord, 'id' | 'createdAt'> & { id?: string }): Promise<AssetRecord> {
    const db = await getBudgetDb();
    const asset: AssetRecord = {
      id: input.id ?? createId(),
      createdAt: new Date().toISOString(),
      dataUrl: input.dataUrl,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height
    };

    await db.put('assets', asset);
    return asset;
  },

  async delete(id: string): Promise<void> {
    const db = await getBudgetDb();
    await db.delete('assets', id);
  }
};

export const accountsRepo = {
  async list(): Promise<Account[]> {
    const db = await getBudgetDb();
    const accounts = await db.getAll('accounts');
    return sortAccounts(accounts);
  },

  async get(id: string): Promise<Account | undefined> {
    const db = await getBudgetDb();
    return db.get('accounts', id);
  },

  async seedStarterAccounts(accounts: Account[]): Promise<Account[]> {
    const db = await getBudgetDb();
    const transaction = db.transaction('accounts', 'readwrite');

    await transaction.store.clear();

    for (const account of accounts) {
      await transaction.store.put(account);
    }

    await transaction.done;
    return sortAccounts(accounts);
  },

  async create(input: Omit<AddAccountInput, 'logoFile'> & { logoAssetId: string }): Promise<Account> {
    ensureFiveIncrement(input.balanceCents);

    const db = await getBudgetDb();
    const existingAccounts = await db.getAll('accounts');
    const account: Account = {
      id: createId(),
      createdAt: new Date().toISOString(),
      name: input.name,
      logoAssetId: input.logoAssetId,
      balanceCents: input.balanceCents,
      sortOrder: existingAccounts.length
    };

    await db.put('accounts', account);
    return account;
  },

  async updateBalance(accountId: string, deltaCents: number): Promise<Account> {
    ensureFiveIncrement(deltaCents);

    const db = await getBudgetDb();
    const account = await db.get('accounts', accountId);

    if (!account) {
      throw new Error('Account not found.');
    }

    const nextBalance = account.balanceCents + deltaCents;
    ensureFiveIncrement(nextBalance);

    const updatedAccount: Account = {
      ...account,
      balanceCents: nextBalance
    };

    await db.put('accounts', updatedAccount);
    return updatedAccount;
  }
};

export const expensesRepo = {
  async listByAccount(accountId: string): Promise<Expense[]> {
    const db = await getBudgetDb();
    const expenses = await db.getAllFromIndex('expenses', 'by-account', accountId);
    return sortExpenses(expenses);
  },

  async listAll(): Promise<Expense[]> {
    const db = await getBudgetDb();
    const expenses = await db.getAll('expenses');
    return sortExpenses(expenses);
  },

  async create(input: AddExpenseInput): Promise<Expense> {
    ensureFiveIncrement(input.amountCents);

    const db = await getBudgetDb();
    const expense: Expense = {
      id: createId(),
      createdAt: new Date().toISOString(),
      accountId: input.accountId,
      name: input.name,
      dateISO: input.dateISO,
      amountCents: input.amountCents
    };

    await db.put('expenses', expense);
    return expense;
  },

  async delete(id: string): Promise<void> {
    const db = await getBudgetDb();
    await db.delete('expenses', id);
  }
};

export const wishlistRepo = {
  async list(): Promise<WishlistItem[]> {
    const db = await getBudgetDb();
    const wishlistItems = await db.getAll('wishlist');
    return sortWishlistItems(wishlistItems);
  },

  async create(
    input: Omit<AddWishlistInput, 'imageFile'> & { imageAssetId: string }
  ): Promise<WishlistItem> {
    const db = await getBudgetDb();
    const wishlistItem: WishlistItem = {
      id: createId(),
      createdAt: new Date().toISOString(),
      imageAssetId: input.imageAssetId,
      name: input.name,
      priceCents: input.priceCents,
      url: input.url
    };

    await db.put('wishlist', wishlistItem);
    return wishlistItem;
  },

  async delete(id: string): Promise<void> {
    const db = await getBudgetDb();
    await db.delete('wishlist', id);
  }
};

export async function clearAllLocalData(): Promise<void> {
  settingsRepo.reset();
  await resetBudgetDb();
}
