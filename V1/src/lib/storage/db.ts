import { DBSchema, deleteDB, openDB } from 'idb';
import type { Account, AssetRecord, Expense, WishlistItem } from '../types';

interface BudgetDbSchema extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
  expenses: {
    key: string;
    value: Expense;
    indexes: {
      'by-account': string;
      'by-createdAt': string;
    };
  };
  wants: {
    key: string;
    value: WishlistItem;
    indexes: {
      'by-createdAt': string;
    };
  };
  wishlist: {
    key: string;
    value: WishlistItem;
    indexes: {
      'by-createdAt': string;
    };
  };
  assets: {
    key: string;
    value: AssetRecord;
  };
}

const DB_NAME = 'budget-pwa-v1';
const DB_VERSION = 2;

let dbPromise: Promise<import('idb').IDBPDatabase<BudgetDbSchema>> | null = null;

export function getBudgetDb() {
  dbPromise ??= openDB<BudgetDbSchema>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-account', 'accountId');
        expenseStore.createIndex('by-createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('wants')) {
        const legacyWishlistStore = db.createObjectStore('wants', { keyPath: 'id' });
        legacyWishlistStore.createIndex('by-createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('wishlist')) {
        const wishlistStore = db.createObjectStore('wishlist', { keyPath: 'id' });
        wishlistStore.createIndex('by-createdAt', 'createdAt');
      }

      if (oldVersion < 2 && db.objectStoreNames.contains('wants')) {
        const legacyWishlistItems = await transaction.objectStore('wants').getAll();

        for (const wishlistItem of legacyWishlistItems) {
          await transaction.objectStore('wishlist').put(wishlistItem);
        }
      }

      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
    }
  });

  return dbPromise;
}

export async function resetBudgetDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  await deleteDB(DB_NAME);
}
