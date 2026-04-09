export function createId(): string {
  const webCrypto = globalThis.crypto;

  if (!webCrypto) {
    throw new Error('Web Crypto is not available in this browser.');
  }

  return webCrypto.randomUUID();
}
