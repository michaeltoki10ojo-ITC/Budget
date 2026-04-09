import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, verifyPin } from './pin';

describe('pin utilities', () => {
  it('validates a 4-digit numeric pin', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('hashes and verifies pins', async () => {
    const hash = await hashPin('2468');

    expect(hash).toHaveLength(64);
    await expect(verifyPin('2468', hash)).resolves.toBe(true);
    await expect(verifyPin('1357', hash)).resolves.toBe(false);
  });
});
