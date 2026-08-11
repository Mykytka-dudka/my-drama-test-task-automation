import { expect } from '../../src/fixtures';
import type { PageFactory } from '../../src/pages/page-factory';
import type { Price } from '../../src/utils';

/**
 * Asserts that the checkout screen - which spans two zones, the host page and the payment
 * provider's cross-origin iframe - matches the price advertised on the paywall a moment earlier.
 *
 * The expected price is a parameter rather than a constant because currency and amount are
 * region-dependent: a Ukrainian session sees `ГРН`, a CI runner elsewhere would not (see
 * docs/exploration-notes.md, section 1). The only correct expected value is the one this same
 * test read from the paywall moments earlier, never a literal.
 */
export async function expectCheckoutMatchesPaywall(app: PageFactory, advertisedPrice: Price): Promise<void> {
  await app.checkout.expectRendered();

  // Polled rather than read once: the checkout total is a computed summary (plan price minus
  // discount), so a two-phase render that mounts the undiscounted figure first would make a
  // single read fail with "299 did not match 99" - a false pricing defect, the worst possible
  // failure message for this test. Currency and amount are still compared as separate fields.
  await expect
    .poll(() => app.checkout.readTotalTodayPrice(), {
      message:
        `checkout total never settled on the price the paywall advertised ` +
        `(${advertisedPrice.currency} ${advertisedPrice.amount})`,
    })
    .toEqual(advertisedPrice);

  await app.checkout.expectSubscribeClickable();
  await app.checkoutCardForm.expectCardFieldsEditable();
}
