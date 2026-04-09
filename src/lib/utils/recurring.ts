import type {
  Account,
  MonthlySummary,
  RecurringCadence,
  RecurringRule,
  Transaction
} from '../types';
import { sumCents } from './money';

export function addCadence(dateISO: string, cadence: RecurringCadence): string {
  const nextDate = new Date(`${dateISO}T12:00:00`);

  if (cadence === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (cadence === 'biweekly') {
    nextDate.setDate(nextDate.getDate() + 14);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate.toISOString().slice(0, 10);
}

export function listDueRecurringDates(
  nextRunDate: string,
  cadence: RecurringCadence,
  untilDateISO: string
): string[] {
  const dueDates: string[] = [];
  let cursor = nextRunDate;

  while (cursor <= untilDateISO) {
    dueDates.push(cursor);
    cursor = addCadence(cursor, cadence);
  }

  return dueDates;
}

export function getTransactionDelta(transaction: Transaction): number {
  switch (transaction.type) {
    case 'expense':
    case 'transfer_out':
      return -Math.abs(transaction.amountCents);
    case 'income':
    case 'transfer_in':
      return Math.abs(transaction.amountCents);
    case 'adjustment':
      return transaction.amountCents;
    default:
      return transaction.amountCents;
  }
}

export function deriveAccountBalance(
  account: Pick<Account, 'id' | 'openingBalanceCents'>,
  transactions: Transaction[]
): number {
  const transactionTotal = sumCents(
    transactions
      .filter((transaction) => transaction.accountId === account.id)
      .map(getTransactionDelta)
  );

  return account.openingBalanceCents + transactionTotal;
}

export function buildMonthlySummary(
  accounts: Array<Pick<Account, 'balanceCents'>>,
  transactions: Transaction[],
  selectedMonth = new Date()
): MonthlySummary {
  const monthKey = `${selectedMonth.getFullYear()}-${`${selectedMonth.getMonth() + 1}`.padStart(
    2,
    '0'
  )}`;
  const monthlyTransactions = transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey)
  );

  const incomeCents = sumCents(
    monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .map((transaction) => Math.abs(transaction.amountCents))
  );
  const expenseCents = sumCents(
    monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .map((transaction) => Math.abs(transaction.amountCents))
  );
  const adjustmentCents = sumCents(
    monthlyTransactions
      .filter((transaction) => transaction.type === 'adjustment')
      .map((transaction) => transaction.amountCents)
  );
  const accountTotalCents = sumCents(accounts.map((account) => account.balanceCents));

  return {
    monthLabel: selectedMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    }),
    incomeCents,
    expenseCents,
    adjustmentCents,
    netCents: incomeCents - expenseCents + adjustmentCents,
    accountTotalCents
  };
}

export function getRecurringRulePreview(rule: Pick<RecurringRule, 'nextRunDate' | 'cadence'>) {
  return `${rule.cadence[0].toUpperCase()}${rule.cadence.slice(1)} • next ${rule.nextRunDate}`;
}
