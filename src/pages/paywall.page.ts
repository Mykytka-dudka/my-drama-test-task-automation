import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { Price } from '../utils';
import { BasePage } from './base.page';

/**
 * The paywall - opens as a modal, the URL does not change, and it is removed from the DOM once
 * checkout opens, so its price must be captured before the buy button is tapped.
 *
 * **Two designs are live, and which one appears is decided by a running experiment.** The
 * vendor's own configuration (`premium_modal_design_variant`) forces `f1_paywall` for every
 * country except the United States, and inside the United States runs a 50/50 split between
 * `f1_paywall` and `not_sure`, bucketed on `userId`. Because every test creates a fresh account,
 * a US run draws a fresh coin on every attempt - which is exactly why CI needed retries and a
 * Ukrainian run never does.
 *
 * So both are modelled:
 *
 * - **f1** - two plan columns. `paywall-f1-price`, `paywall-f1-auto-renew` and
 *   `paywall-f1-buy-button` each resolve to 2 nodes, one per column, so each is scoped through
 *   the left column, the 4-week plan.
 * - **not_sure** - one subscribe button carrying both amounts inline, no plan columns and no
 *   price node of its own.
 *
 * Locators for the second design were read from the DOM snapshot inside a CI trace, which is the
 * only vantage point this experiment could be observed from.
 */
export class PaywallPage extends BasePage {
  private readonly f1Root: Locator;
  private readonly notSureRoot: Locator;

  /** Either design, for the assertions and branches that do not care which one arrived. */
  readonly root: Locator;

  /** Either the paywall or the e-mail gate: the content flow's order is region-dependent. */
  private readonly paywallOrLoginGate: Locator;

  private readonly f1FirstPlanColumn: Locator;
  private readonly f1FirstPlanPrice: Locator;
  private readonly f1FirstPlanBuyButton: Locator;

  private readonly notSureSubscribeButton: Locator;

  /**
   * The `not_sure` design has no price node: its button reads "Subscribe $14.99 today, then
   * $44.99 every 4 weeks", with each amount in its own `strong`. The first is the amount charged
   * today, which is the one the checkout total must match.
   */
  private readonly notSureTodayPrice: Locator;

  constructor(page: Page) {
    super(page);
    this.f1Root = page.getByTestId('paywall-f1');
    this.notSureRoot = page.getByTestId('paywall-not-sure');
    this.root = this.f1Root.or(this.notSureRoot);
    this.paywallOrLoginGate = this.root.or(page.getByTestId('login-modal-container'));

    this.f1FirstPlanColumn = page.getByTestId('paywall-f1-plan-column-left');
    this.f1FirstPlanPrice = this.f1FirstPlanColumn.getByTestId('paywall-f1-price');
    this.f1FirstPlanBuyButton = this.f1FirstPlanColumn.getByTestId('paywall-f1-buy-button');

    this.notSureSubscribeButton = page.getByTestId('paywall-not-sure-subscribe-button');
    this.notSureTodayPrice = this.notSureSubscribeButton.locator('strong').first();
  }

  /**
   * The paywall is known to hang on an infinite spinner with no error UI when
   * `GET /api/v1/catalog/offerings/{offering}?provider={provider}` fails, so the message points
   * there first - it is the likeliest cause once both designs have been ruled out.
   */
  async expectOpen(): Promise<void> {
    await expect(
      this.root,
      'no paywall appeared in either design: check ' +
        'GET /api/v1/catalog/offerings/{offering}?provider={provider} - a failed offerings ' +
        'request leaves the paywall spinning forever with no error UI',
    ).toBeVisible();
  }

  /** Waits until either the paywall or the e-mail gate is on screen, whichever this region shows. */
  async expectOpenOrLoginPrompted(): Promise<void> {
    await expect(
      this.paywallOrLoginGate,
      'tapping a locked episode opened neither a paywall nor the e-mail gate',
    ).toBeVisible();
  }

  async readFirstPlanPrice(): Promise<Price> {
    return this.readPrice(
      await this.showsNotSureDesign() ? this.notSureTodayPrice : this.f1FirstPlanPrice,
      'the paywall rendered but never showed a price for its first plan - the offerings request ' +
        'may have returned a partial or failed response',
    );
  }

  async tapFirstPlanBuyButton(): Promise<void> {
    const button = (await this.showsNotSureDesign())
      ? this.notSureSubscribeButton
      : this.f1FirstPlanBuyButton;

    await button.tap();
  }

  /**
   * Safe only after `expectOpen`, which settles which design rendered; on its own this check
   * would race the modal.
   */
  private async showsNotSureDesign(): Promise<boolean> {
    return this.notSureRoot.isVisible();
  }
}
