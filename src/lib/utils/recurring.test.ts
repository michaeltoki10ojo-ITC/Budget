import { describe, expect, it } from 'vitest';
import { addCadence, buildMonthlySummary, deriveAccountBalance } from './recurring';

describe('recurring helpers', () => {
  it('advances monthly cadence by one month', () => {
    expect(addCadence('2026-04-15', 'monthly')).toBe('2026-05-15');
  });

  it('derives an account balance from opening balance plus ledger deltas', () => {
    expect(
      deriveAccountBalance(
        {
          id: 'checking',
          openingBalanceCents: 10000
        },
        [
          {
            id: 'txn-1',
            userId: 'user-1',
            accountId: 'checking',
            type: 'expense',
            name: 'Groceries',
            amountCents: 2500,
            date: '2026-04-01',
            linkedTransferId: null,
            recurringRuleId: null,
            createdAt: '2026-04-01T00:00:00.000Z'
          },
          {
            id: 'txn-2',
            userId: 'user-1',
            accountId: 'checking',
            type: 'income',
            name: 'Paycheck',
            amountCents: 6000,
            date: '2026-04-02',
            linkedTransferId: null,
            recurringRuleId: null,
            createdAt: '2026-04-02T00:00:00.000Z'
          }
        ]
      )
    ).toBe(13500);
  });

  it('builds a monthly summary without counting transfers as spend', () => {
    const summary = buildMonthlySummary(
      [
        {
          balanceCents: 15000
        }
      ],
      [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'checking',
          type: 'income',
          name: 'Paycheck',
          amountCents: 40000,
          date: '2026-04-01',
          linkedTransferId: null,
          recurringRuleId: null,
          createdAt: '2026-04-01T00:00:00.000Z'
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'checking',
          type: 'expense',
          name: 'Rent',
          amountCents: 12000,
          date: '2026-04-02',
          linkedTransferId: null,
          recurringRuleId: null,
          createdAt: '2026-04-02T00:00:00.000Z'
        },
        {
          id: 'txn-3',
          userId: 'user-1',
          accountId: 'checking',
          type: 'transfer_out',
          name: 'Move to savings',
          amountCents: 5000,
          date: '2026-04-03',
          linkedTransferId: 'txn-4',
          recurringRuleId: null,
          createdAt: '2026-04-03T00:00:00.000Z'
        }
      ],
      new Date('2026-04-15T12:00:00')
    );

    expect(summary.incomeCents).toBe(40000);
    expect(summary.expenseCents).toBe(12000);
    expect(summary.netCents).toBe(28000);
  });
});
