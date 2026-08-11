import { test as base, expect } from '@playwright/test';

import { CookieConsentComponent } from '../components';
import { PageFactory } from '../pages/page-factory';
import { FirstPartyGuard } from './first-party-guard';

interface AppFixtures {
  /** The single object a spec reaches every screen through. */
  app: PageFactory;

  /**
   * Applies to every test automatically, so no spec ever registers a page listener itself.
   * Reports; never decides the outcome - see the guard's own docblock for why.
   */
  consoleGuard: void;

  /**
   * Arms the consent-overlay dismissal before the first navigation. Automatic, because a run
   * from a region where the overlay shows cannot perform a single tap until it is handled.
   */
  consentGuard: void;
}

export const test = base.extend<AppFixtures>({
  app: async ({ page }, use) => {
    await use(new PageFactory(page));
  },

  consentGuard: [
    async ({ page }, use) => {
      await new CookieConsentComponent(page).armAutoDismiss();

      await use();
    },
    { auto: true },
  ],

  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const guard = new FirstPartyGuard(page);

      await use();

      if (!guard.hasFindings()) {
        return;
      }

      await testInfo.attach('first-party-diagnostics', {
        body: JSON.stringify(guard.findings(), null, 2),
        contentType: 'application/json',
      });
    },
    { auto: true },
  ],
});

export { expect };
