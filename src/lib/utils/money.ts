import type { AccountRoundingMode, RoundingMode } from '../types';

export const DEFAULT_ROUNDING_MODE: RoundingMode = 'nearest_5';

export type RoundingDirection = 'down' | 'up';

export const ROUNDING_MODE_OPTIONS: Array<{ value: RoundingMode; label: string }> = [
  { value: 'exact', label: 'Exact' },
  { value: 'nearest_5', label: 'Nearest $5' },
  { value: 'nearest_10', label: 'Nearest $10' }
];

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

export function getIncrementForMode(mode: RoundingMode): number {
  switch (mode) {
    case 'exact':
      return 1;
    case 'nearest_5':
      return 500;
    case 'nearest_10':
      return 1000;
  }
}

export function getRoundingModeLabel(mode: RoundingMode): string {
  return ROUNDING_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? 'Nearest $5';
}

export function buildAccountRoundingOptions() {
  return ROUNDING_MODE_OPTIONS;
}

export function getInputFractionDigits(mode: RoundingMode): number {
  return mode === 'exact' ? 2 : 0;
}

export function resolveAccountRoundingMode(
  profileDefaultMode: RoundingMode,
  accountOverrideMode: AccountRoundingMode | 'inherit_default' | null | undefined
): RoundingMode {
  return normalizeAccountRoundingMode(accountOverrideMode, profileDefaultMode);
}

export function normalizeAccountRoundingMode(
  value: AccountRoundingMode | 'inherit_default' | string | null | undefined,
  fallback: RoundingMode = DEFAULT_ROUNDING_MODE
): AccountRoundingMode {
  if (value === 'exact' || value === 'nearest_5' || value === 'nearest_10') {
    return value;
  }

  return fallback;
}

export function describeRoundingRule(
  mode: RoundingMode,
  direction: RoundingDirection
): string {
  if (mode === 'exact') {
    return 'keep exact amounts.';
  }

  return `${direction === 'down' ? 'round down' : 'round up'} to the nearest ${getRoundingModeLabel(mode).replace('Nearest ', '')}.`;
}

export function roundAmountCents(
  cents: number,
  mode: RoundingMode,
  direction: RoundingDirection
): number {
  if (mode === 'exact') {
    return cents;
  }

  const increment = getIncrementForMode(mode);
  const absoluteCents = Math.abs(cents);
  const round = direction === 'down' ? Math.floor : Math.ceil;
  const roundedCents = round(absoluteCents / increment) * increment;

  if (roundedCents === 0) {
    return 0;
  }

  return cents < 0 ? -roundedCents : roundedCents;
}

export function roundCurrencyInput(
  value: string,
  mode: RoundingMode,
  direction: RoundingDirection
): { originalCents: number; roundedCents: number; didRound: boolean } | null {
  const originalCents = parseCurrencyInputToCents(value);

  if (originalCents === null) {
    return null;
  }

  const roundedCents = roundAmountCents(originalCents, mode, direction);

  return {
    originalCents,
    roundedCents,
    didRound: roundedCents !== originalCents
  };
}

export function getSignedInputDirection(value: string): RoundingDirection {
  return value.trim().startsWith('-') ? 'up' : 'down';
}

export function sumCents(values: number[]): number {
  return values.reduce((total, current) => total + current, 0);
}

export function centsToInputValue(cents: number, fractionDigits = 2): string {
  return (cents / 100).toFixed(fractionDigits);
}
