import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { Price } from '../utils';
import { BasePage } from './base.page';

/**
 * The paywall - opens as a modal, the URL does not change. `paywall-f1-price`,
 * `paywall-f1-auto-renew` and `paywall-f1-buy-button` each resolve to 2 nodes, one per plan
 * column, so every one of them is scoped through its column here; a page-wide query would be
 * ambiguous. The suite only ever uses the left column - the 4-week plan.
 *
 * The paywall is removed from the DOM once checkout opens, so its price must be captured before
 * the buy button is tapped.
 */
export class PaywallPage extends BasePage {
  readonly root: Locator;
  private readonly firstPlanColumn: Locator;

  /**
   * Whichever of the two screens the content flow lands on first. Which one it is depends on the
   * region, so the flow waits on the pair and then branches.
   */
  private readonly paywallOrLoginGate: Locator;
  readonly firstPlanPrice: Locator;
  readonly firstPlanBuyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('paywall-f1');
    this.paywallOrLoginGate = this.root.or(page.getByTestId('login-modal-container'));
    this.firstPlanColumn = page.getByTestId('paywall-f1-plan-column-left');
    this.firstPlanPrice = this.firstPlanColumn.getByTestId('paywall-f1-price');
    this.firstPlanBuyButton = this.firstPlanColumn.getByTestId('paywall-f1-buy-button');
  }

  /**
   * The paywall is known to hang on an infinite spinner with no error UI when
   * `GET /api/v1/catalog/offerings/{offering}?provider={provider}` fails - by far the most
   * likely cause if this assertion fails, so the failure message points there first.
   */
  async expectOpen(): Promise<void> {
    await expect(
      this.root,
      'paywall never appeared: check GET /api/v1/catalog/offerings/{offering}?provider={provider} - a failed ' +
        'offerings request leaves the paywall spinning forever with no error UI',
    ).toBeVisible();
  }

  async readFirstPlanPrice(): Promise<Price> {
    return this.readPrice(
      this.firstPlanPrice,
      'the paywall shell rendered but its first plan never showed a price - the offerings ' +
        'request may have returned a partial or failed response',
    );
  }

  /** Waits until either the paywall or the e-mail gate is on screen, whichever this region shows. */
  async expectOpenOrLoginPrompted(): Promise<void> {
    await expect(
      this.paywallOrLoginGate,
      'tapping a locked episode opened neither the paywall nor the e-mail gate',
    ).toBeVisible();
  }

  async tapFirstPlanBuyButton(): Promise<void> {
    await this.firstPlanBuyButton.tap();
  }
}
