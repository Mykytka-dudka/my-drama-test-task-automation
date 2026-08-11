import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The manage-subscription screen at `/settings/manage-subscription`. `getFullAccessButton`
 * reflects the empty-subscription state, which is always the state a freshly created throwaway
 * account is in.
 */
export class ManageSubscriptionPage extends BasePage {
  readonly getFullAccessButton: Locator;

  constructor(page: Page) {
    super(page);
    this.getFullAccessButton = page.getByTestId('subscription-list-empty-get-access-button');
  }

  async expectLoaded(): Promise<void> {
    await this.expectPath(
      '/settings/manage-subscription',
      'manage subscription screen did not load: unexpected URL',
    );
    await expect(
      this.getFullAccessButton,
      'manage subscription screen did not load: Get Full Access button never appeared. This ' +
        'screen is A/B-versioned - check localStorage `$abTestGroups.settingsFlowVersion`, which ' +
        'was "v5" when these locators were captured',
    ).toBeVisible();
  }

  async tapGetFullAccess(): Promise<void> {
    await this.getFullAccessButton.tap();
  }
}
