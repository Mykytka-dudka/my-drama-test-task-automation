import { test as base, expect } from '@playwright/test';

import { PageFactory } from '../pages/page-factory';
import { FirstPartyGuard } from './first-party-guard';

interface AppFixtures {
  /** The single object a spec reaches every screen through. */
  app: PageFactory;

  /**
   * Applies to every test automatically, so no spec ever registers a page listener itself.
   */
  consoleGuard: void;
}

export const test = base.extend<AppFixtures>({
  app: async ({ page }, use) => {
    await use(new PageFactory(page));
  },

  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const guard = new FirstPartyGuard(page);

      await use();

      if (guard.hasFindings()) {
        await testInfo.attach('first-party-diagnostics', {
          body: JSON.stringify(guard.findings(), null, 2),
          contentType: 'application/json',
        });
      }

      const failures = guard.failedApiRequests;

      expect(
        failures,
        `the app's own API failed during this test, which is the usual cause of a paywall ` +
          `that never renders:\n${failures.join('\n')}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
