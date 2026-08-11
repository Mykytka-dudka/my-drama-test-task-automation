import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The e-mail login modal. It opens from the header Sign In button and, in the content flow, from
 * the paywall. Login completes instantly on submit: no OTP, no password, no verification step.
 *
 * **Where the content flow's gate appears is region-dependent.** From Ukraine a locked episode
 * opens the paywall and this modal appears only after a plan is chosen; from the United States it
 * appears first, before the paywall. Both orders were observed live - the second on a CI runner.
 * `signInIfPrompted` exists so the flow can be written once for both.
 */
export class LoginModalPage extends BasePage {
  readonly container: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.container = page.getByTestId('login-modal-container');
    this.emailInput = this.container.getByTestId('login-modal-email-input');
    this.submitButton = this.container.getByTestId('login-modal-submit-button');
  }

  async expectOpen(): Promise<void> {
    await expect(this.container, 'login modal never opened').toBeVisible();
  }

  async signInWith(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.tap();
  }

  /**
   * Signs in only when the gate is actually showing. Safe to call unconditionally, but only
   * directly after a wait that has settled which screen is on top - otherwise the visibility
   * check races the render.
   */
  async signInIfPrompted(email: string): Promise<void> {
    if (await this.container.isVisible()) {
      await this.signInWith(email);
    }
  }
}
