import type { Locator, Page } from '@playwright/test';

/**
 * The CookieYes consent widget. It carries no test ids, so it is the one documented exception to
 * the `data-testid` rule; its controls are anchored on `data-cky-tag`, a stable semantic attribute
 * the vendor emits, and only the overlay is anchored on a class, because that element has no
 * other handle.
 *
 * What is deployed here was read from CookieYes's own targeting configuration: 52 rules, one
 * banner, covering the 51 US states and Ukraine, with no EU country at all - so there is no GDPR
 * accept/reject notice, and forcing an EU geolocation renders no widget.
 *
 * **From a US address the CCPA "Opt-out Preferences" dialog opens on load and blocks the page.**
 * Its `.cky-overlay` covers the full viewport at `z-index: 99999999` with `pointer-events: auto`,
 * so every tap fails with "intercepts pointer events" until it is dismissed. From a Ukrainian
 * address the same widget stays hidden. Both states were observed live, the US one by stubbing
 * CookieYes's geolocation endpoint.
 *
 * The widget is injected asynchronously by a third-party script, so a one-shot check after
 * navigation loses the race - which is exactly how this reached CI. `addLocatorHandler` is
 * Playwright's tool for this shape of problem: the handler fires whenever the overlay actually
 * blocks an action, on any screen, however late it appears.
 */
export class CookieConsentComponent {
  private readonly overlay: Locator;
  private readonly dismissButton: Locator;

  constructor(private readonly page: Page) {
    this.overlay = page.locator('.cky-overlay');
    this.dismissButton = page.locator('[data-cky-tag="optout-cancel-button"]');
  }

  /** Must be armed before the first navigation. Costs nothing where the widget never shows. */
  async armAutoDismiss(): Promise<void> {
    await this.page.addLocatorHandler(this.overlay, async () => {
      await this.dismissButton.tap();
    });
  }
}
