import type { Locator, Page } from '@playwright/test';

/**
 * The CookieYes consent widget. It carries no test ids, so it is the one documented exception to
 * the `data-testid` rule, and it is anchored on `data-cky-tag` - a stable semantic attribute the
 * vendor emits - never on a CSS class.
 *
 * What this site actually deploys was read from CookieYes's own targeting configuration rather
 * than assumed: 52 rules, all pointing at a single banner, covering exactly two countries - the
 * 51 US states plus Ukraine (`regionName IS 'EU' AND countryName IS 'UA'`). **No EU country is
 * configured**, so there is no GDPR accept/reject notice on this site at all; forcing an EU
 * geolocation renders no widget whatsoever, and the notice container stays empty.
 *
 * The one widget that does exist is the CCPA "Opt-out Preferences" dialog, which is hidden on
 * load and only opens when the user follows the "Do Not Sell or Share My Personal Information"
 * link. It therefore never blocks a run that does not go looking for it.
 *
 * `dismissIfPresent` is kept as a cheap safety net for the case where a future configuration
 * change starts showing it on load: one visibility check on the initial navigation, and a tap
 * only if the dialog is genuinely open. It is not re-checked on later screens, which are reached
 * by tapping rather than navigating.
 */
export class CookieConsentComponent {
  private readonly dismissButton: Locator;

  constructor(page: Page) {
    this.dismissButton = page.locator('[data-cky-tag="optout-cancel-button"]');
  }

  async dismissIfPresent(): Promise<void> {
    if (await this.dismissButton.isVisible()) {
      await this.dismissButton.tap();
    }
  }
}
