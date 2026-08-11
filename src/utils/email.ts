/**
 * Test e-mail generation.
 *
 * `example.com` is IANA-reserved for documentation and can never resolve to a real mailbox,
 * so throwaway accounts created against it are safe by construction. It was verified live
 * that the app accepts this domain and logs the generated user in immediately (see
 * docs/exploration-notes.md, section 3).
 *
 * Collision avoidance uses the current epoch time plus a random suffix so that two projects
 * (mobile-chrome and mobile-safari) running in parallel never generate the same address.
 */

const RANDOM_SUFFIX_LENGTH = 6;

export function generateTestEmail(): string {
  const timestamp = Date.now();
  const randomSuffix = generateRandomSuffix(RANDOM_SUFFIX_LENGTH);

  return `qa.auto.${timestamp}.${randomSuffix}@example.com`;
}

function generateRandomSuffix(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    suffix += alphabet.charAt(index);
  }

  return suffix;
}
