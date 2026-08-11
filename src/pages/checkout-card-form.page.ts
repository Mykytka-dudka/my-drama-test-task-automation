import type { FrameLocator, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { TIMEOUTS } from '../config';
import { BasePage } from './base.page';

/**
 * The card fields of the checkout screen, which live inside the cross-origin payment-provider
 * iframe (`https://form-v2.solidgate.com`) rather than on the host page. The frame is resolved
 * once, in the constructor, scoped through the `payment-form-container` test-id rather than the
 * provider's own element id, so a provider change is contained to this class: the frame handle
 * plus the three accessible field names below.
 *
 * There are no test ids inside the iframe; fields are located by their accessible name instead.
 * The suite never fills these fields and never submits payment - see `expectCardFieldsEditable`.
 */
export class CheckoutCardFormPage extends BasePage {
  readonly frame: FrameLocator;
  readonly cardNumberField: Locator;
  readonly expiryField: Locator;
  readonly cvvField: Locator;

  constructor(page: Page) {
    super(page);
    this.frame = page.frameLocator('[data-testid="payment-form-container"] iframe');
    this.cardNumberField = this.frame.getByRole('textbox', { name: 'Credit Card Number' });
    this.expiryField = this.frame.getByRole('textbox', { name: 'Expiration Date' });
    this.cvvField = this.frame.getByRole('textbox', { name: 'CVV' });
  }

  /**
   * `toBeEditable()` is what proves a field is neither disabled nor readonly; visibility alone
   * would pass without proving that.
   *
   * The provider's form loads noticeably later than the host modal around it, so the first
   * visibility assertion gets the longer `TIMEOUTS.paymentFrame` budget - a longer wait for a
   * genuine state change, not a sleep.
   *
   * Imperative reads race this cross-origin frame - a captured snapshot once had `isEditable()`
   * report `true` while `count()` reported `0` at the same moment - so only these auto-retrying
   * web-first assertions are sound here; do not replace them with imperative checks.
   */
  async expectCardFieldsEditable(): Promise<void> {
    await expect(this.cardNumberField, 'card number field never became visible').toBeVisible({
      timeout: TIMEOUTS.paymentFrame,
    });
    await expect(this.cardNumberField, 'card number field never became editable').toBeEditable();

    await expect(this.expiryField, 'expiry field never became visible').toBeVisible();
    await expect(this.expiryField, 'expiry field never became editable').toBeEditable();

    await expect(this.cvvField, 'CVV field never became visible').toBeVisible();
    await expect(this.cvvField, 'CVV field never became editable').toBeEditable();
  }
}
