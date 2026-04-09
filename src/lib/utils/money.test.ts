import { describe, expect, it } from 'vitest';
import {
  buildAccountRoundingOptions,
  centsToInputValue,
  describeRoundingRule,
  formatCurrency,
  getIncrementForMode,
  getInputFractionDigits,
  getSignedInputDirection,
  normalizeAccountRoundingMode,
  parseCurrencyInputToCents,
  resolveAccountRoundingMode,
  roundAmountCents,
  roundCurrencyInput,
  sumCents
} from './money';

describe('money utilities', () => {
  it('parses currency inputs into cents', () => {
    expect(parseCurrencyInputToCents('20')).toBe(2000);
    expect(parseCurrencyInputToCents('129.99')).toBe(12999);
    expect(parseCurrencyInputToCents('')).toBeNull();
  });

  it('exposes increments and labels for each rounding mode', () => {
    expect(getIncrementForMode('exact')).toBe(1);
    expect(getIncrementForMode('nearest_5')).toBe(500);
    expect(getIncrementForMode('nearest_10')).toBe(1000);
    expect(buildAccountRoundingOptions()[0].label).toBe('Exact');
    expect(getInputFractionDigits('exact')).toBe(2);
    expect(getInputFractionDigits('nearest_5')).toBe(0);
  });

  it('rounds positive additions down and subtractions up', () => {
    expect(roundAmountCents(2399, 'nearest_5', 'down')).toBe(2000);
    expect(roundAmountCents(2399, 'nearest_5', 'up')).toBe(2500);
    expect(roundAmountCents(-2399, 'nearest_10', 'up')).toBe(-3000);
    expect(roundAmountCents(-2399, 'nearest_10', 'down')).toBe(-2000);
    expect(roundAmountCents(2399, 'exact', 'down')).toBe(2399);
  });

  it('rounds parsed currency inputs for exact, nearest five, and nearest ten', () => {
    expect(roundCurrencyInput('23.99', 'nearest_5', 'down')).toEqual({
      originalCents: 2399,
      roundedCents: 2000,
      didRound: true
    });
    expect(roundCurrencyInput('21', 'nearest_5', 'up')).toEqual({
      originalCents: 2100,
      roundedCents: 2500,
      didRound: true
    });
    expect(roundCurrencyInput('21', 'nearest_10', 'up')).toEqual({
      originalCents: 2100,
      roundedCents: 3000,
      didRound: true
    });
    expect(roundCurrencyInput('21.49', 'exact', 'down')).toEqual({
      originalCents: 2149,
      roundedCents: 2149,
      didRound: false
    });
    expect(roundCurrencyInput('', 'nearest_10', 'up')).toBeNull();
  });

  it('resolves account overrides against the profile default', () => {
    expect(resolveAccountRoundingMode('nearest_5', 'inherit_default')).toBe('nearest_5');
    expect(resolveAccountRoundingMode('nearest_5', 'exact')).toBe('exact');
    expect(normalizeAccountRoundingMode('inherit_default')).toBe('nearest_5');
    expect(getSignedInputDirection('-15')).toBe('up');
    expect(getSignedInputDirection('15')).toBe('down');
    expect(describeRoundingRule('nearest_10', 'up')).toContain('$10');
    expect(describeRoundingRule('exact', 'down')).toBe('keep exact amounts.');
  });

  it('formats and sums cents', () => {
    expect(formatCurrency(2500)).toBe('$25.00');
    expect(sumCents([500, 1000, -500])).toBe(1000);
    expect(centsToInputValue(2500, 0)).toBe('25');
    expect(centsToInputValue(2599, 2)).toBe('25.99');
  });
});
