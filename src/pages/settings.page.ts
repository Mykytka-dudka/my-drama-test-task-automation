import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The settings screen at `/settings`, reached by tapping the header avatar link after login.
 *
 * This screen is A/B-versioned: visiting it sets `$abTestGroups` to
 * `{"settingsFlowVersion":"v5"}`, the only variant flag observed that can change the account
 * flow's step sequence. Every locator here was captured under v5, so a flip is the first thing to
 * check if this screen stops matching - the assertion messages say so.
 */
export class SettingsPage extends BasePage {
  readonly container: Locator;
  readonly subscriptionsItem: Locator;

  constructor(page: Page) {
    super(page);
    this.container = page.getByTestId('settings-page-container');
    this.subscriptionsItem = page.getByTestId('settings-item-subscriptions');
  }

  async expectLoaded(): Promise<void> {
    await this.expectPath('/settings', 'settings screen did not load: unexpected URL');
    await expect(
      this.container,
      'settings screen did not load: container never appeared. This screen is A/B-versioned - ' +
        'check localStorage `$abTestGroups.settingsFlowVersion`, which was "v5" when these ' +
        'locators were captured',
    ).toBeVisible();
  }

  async tapSubscriptions(): Promise<void> {
    await this.subscriptionsItem.tap();
  }
}
