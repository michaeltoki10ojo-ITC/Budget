export type AppSettings = {
  pinHash: string;
  isSeeded: boolean;
};

export type Account = {
  id: string;
  name: string;
  logoAssetId: string;
  balanceCents: number;
  sortOrder: number;
  createdAt: string;
};

export type Expense = {
  id: string;
  accountId: string;
  name: string;
  dateISO: string;
  amountCents: number;
  createdAt: string;
};

export type WishlistItem = {
  id: string;
  name: string;
  priceCents: number;
  imageAssetId: string;
  url: string;
  createdAt: string;
};

export type AssetRecord = {
  id: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
};

export type SetupAccountInput = {
  name: string;
  balanceCents: number;
  logoFile: File;
};

export type AddAccountInput = {
  name: string;
  balanceCents: number;
  logoFile: File;
};

export type AddExpenseInput = {
  accountId: string;
  name: string;
  dateISO: string;
  amountCents: number;
};

export type AddWishlistInput = {
  name: string;
  priceCents: number;
  url: string;
  imageFile: File;
};
