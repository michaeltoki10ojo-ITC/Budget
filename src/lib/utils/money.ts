export const FIVE_DOLLAR_INCREMENT_CENTS = 500;
export type FiveIncrementRoundMode = 'down' | 'up';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export function formatCurrency(cents: number): string {
  return usdFormatter.format(cents / 100);
}

export function parseCurrencyInputToCents(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(numericValue * 100);
}

export function isFiveIncrement(cents: number): boolean {
  return cents % FIVE_DOLLAR_INCREMENT_CENTS === 0;
}

export function roundToFiveIncrement(
  cents: number,
  mode: FiveIncrementRoundMode
): number {
  const direction = mode === 'down' ? Math.floor : Math.ceil;
  const absoluteCents = Math.abs(cents);
  const roundedCents =
    direction(absoluteCents / FIVE_DOLLAR_INCREMENT_CENTS) * FIVE_DOLLAR_INCREMENT_CENTS;

  if (roundedCents === 0) {
    return 0;
  }

  return cents < 0 ? -roundedCents : roundedCents;
}

export function roundCurrencyInputToFiveIncrement(
  value: string,
  mode: FiveIncrementRoundMode
): { originalCents: number; roundedCents: number; didRound: boolean } | null {
  const originalCents = parseCurrencyInputToCents(value);

  if (originalCents === null) {
    return null;
  }

  const roundedCents = roundToFiveIncrement(originalCents, mode);

  return {
    originalCents,
    roundedCents,
    didRound: roundedCents !== originalCents
  };
}

export function ensureFiveIncrement(cents: number): void {
  if (!isFiveIncrement(cents)) {
    throw new Error('Amount must be in $5 increments.');
  }
}

export function sumCents(values: number[]): number {
  return values.reduce((total, current) => total + current, 0);
}

export function centsToInputValue(cents: number, fractionDigits = 2): string {
  return (cents / 100).toFixed(fractionDigits);
}
