const textEncoder = new TextEncoder();

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(pin));

  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0')
  ).join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!isValidPin(pin)) {
    return false;
  }

  const calculatedHash = await hashPin(pin);
  return calculatedHash === storedHash;
}
