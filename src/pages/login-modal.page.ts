import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The e-mail login modal. It opens from the header Sign In button and, in the content flow, after
 * a plan is chosen on the paywall. Login completes instantly on submit: no OTP, no password, no
 * verification step.
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
}
