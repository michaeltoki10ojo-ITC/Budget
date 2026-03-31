import { describe, expect, it } from 'vitest';
import {
  centsToInputValue,
  ensureFiveIncrement,
  formatCurrency,
  isFiveIncrement,
  parseCurrencyInputToCents,
  roundCurrencyInputToFiveIncrement,
  roundToFiveIncrement,
  sumCents
} from './money';

describe('money utilities', () => {
  it('parses currency inputs into cents', () => {
    expect(parseCurrencyInputToCents('20')).toBe(2000);
    expect(parseCurrencyInputToCents('129.99')).toBe(12999);
    expect(parseCurrencyInputToCents('')).toBeNull();
  });

  it('enforces five dollar increments', () => {
    expect(isFiveIncrement(1500)).toBe(true);
    expect(isFiveIncrement(1250)).toBe(false);
    expect(() => ensureFiveIncrement(1250)).toThrow('$5 increments');
  });

  it('rounds incoming amounts down and outgoing amounts up', () => {
    expect(roundToFiveIncrement(2399, 'down')).toBe(2000);
    expect(roundToFiveIncrement(2399, 'up')).toBe(2500);
    expect(roundToFiveIncrement(2500, 'down')).toBe(2500);
  });

  it('rounds parsed currency inputs to five dollar increments', () => {
    expect(roundCurrencyInputToFiveIncrement('23.99', 'down')).toEqual({
      originalCents: 2399,
      roundedCents: 2000,
      didRound: true
    });
    expect(roundCurrencyInputToFiveIncrement('21', 'up')).toEqual({
      originalCents: 2100,
      roundedCents: 2500,
      didRound: true
    });
    expect(roundCurrencyInputToFiveIncrement('', 'up')).toBeNull();
  });

  it('formats and sums cents', () => {
    expect(formatCurrency(2500)).toBe('$25.00');
    expect(sumCents([500, 1000, -500])).toBe(1000);
    expect(centsToInputValue(2500, 0)).toBe('25');
  });
});
