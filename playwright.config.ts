import { defineConfig } from '@playwright/test';

import { BASE_URL, DEVICE_PROFILE_NAMES, TIMEOUTS, deviceProfile } from './src/config';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: TIMEOUTS.test,
  expect: { timeout: TIMEOUTS.expect },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    navigationTimeout: TIMEOUTS.navigation,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: deviceProfile(DEVICE_PROFILE_NAMES.mobileChrome),
    },
    {
      name: 'mobile-safari',
      use: deviceProfile(DEVICE_PROFILE_NAMES.mobileSafari),
    },
  ],
});
