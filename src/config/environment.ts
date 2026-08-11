import { devices } from '@playwright/test';

import type { DeviceProfile } from './types';

export const BASE_URL = process.env.BASE_URL ?? 'https://my-drama.com';

/**
 * The assignment covers the mobile web app only, so both projects emulate a phone.
 * Names are Playwright's own device-registry keys.
 */
export const DEVICE_PROFILE_NAMES = {
  mobileChrome: 'Pixel 7',
  mobileSafari: 'iPhone 14',
} as const;

/**
 * Reads a profile out of Playwright's device registry, failing loudly when the key is
 * unknown. A plain `devices[name]` spread silently yields no emulation at all, which
 * would quietly turn the whole suite into a desktop run.
 */
export function deviceProfile(name: string): DeviceProfile {
  const profile = devices[name];

  if (!profile) {
    throw new Error(
      `Unknown Playwright device profile "${name}". Available profiles are listed in the ` +
        `@playwright/test device registry.`,
    );
  }

  return profile;
}
