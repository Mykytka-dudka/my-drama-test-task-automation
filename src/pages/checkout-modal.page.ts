import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { Price } from '../utils';
import { BasePage } from './base.page';

/**
 * The label of the one price row inside `payment-container` whose wording does not change with
 * the selected plan - "Your 4-week plan" and "In 4 weeks" both restate the plan length, but
 * "Total today" is stable and is the row that corresponds to the paywall price.
 */
const TOTAL_TODAY_LABEL = 'Total today';

/**
 * The host-page half of the checkout screen - opens as a modal, the URL does not change. The
 * price rows inside `payment-container` carry no test ids; each row's label and value are
 * siblings under a common parent, so the value is reached by anchoring on the label text and
 * traversing to its following sibling.
 */
export class CheckoutModalPage extends BasePage {
  readonly root: Locator;
  readonly title: Locator;
  private readonly priceSummary: Locator;
  readonly totalTodayValue: Locator;
  readonly subscribeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('payment-modal-controller-container');
    this.title = page.getByTestId('payment-modal-title');
    this.priceSummary = page.getByTestId('payment-container');
    this.totalTodayValue = this.priceSummary
      .getByText(TOTAL_TODAY_LABEL, { exact: true })
      .locator('xpath=following-sibling::*[1]');
    this.subscribeButton = page.getByTestId('payment-pay-button');
  }

  async expectRendered(): Promise<void> {
    await expect(this.root, 'checkout modal never appeared').toBeVisible();
    await expect(this.title, 'checkout modal title never appeared').toBeVisible();
  }

  async readTotalTodayPrice(): Promise<Price> {
    return this.readPrice(
      this.totalTodayValue,
      'the "Total today" row never rendered an amount in checkout',
    );
  }

  /** The button is deliberately only asserted, never tapped: the suite must never complete a purchase. */
  async expectSubscribeClickable(): Promise<void> {
    await expect(this.subscribeButton, 'Subscribe button never became visible').toBeVisible();
    await expect(this.subscribeButton, 'Subscribe button never became enabled').toBeEnabled();
  }
}
