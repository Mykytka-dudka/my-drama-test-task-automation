import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The site header. `signInButton` is present only while signed out and is removed from the DOM
 * after login; `avatarLink` is absent before login, appears after login and navigates to
 * `/settings`.
 */
export class HeaderComponent {
  readonly signInButton: Locator;
  readonly avatarLink: Locator;

  constructor(page: Page) {
    this.signInButton = page.getByTestId('header-sign-in-button');
    this.avatarLink = page.getByTestId('header-avatar-link');
  }

  async tapSignIn(): Promise<void> {
    await this.signInButton.tap();
  }

  async tapAvatar(): Promise<void> {
    await this.avatarLink.tap();
  }

  async expectSignedIn(): Promise<void> {
    await expect(
      this.avatarLink,
      'login never completed: the header still offers Sign In. Check the first-party-diagnostics ' +
        'attachment - if it shows no failed auth request, the login succeeded and the app simply ' +
        'did not reflect it, which has been observed on WebKit (see NOTES.md)',
    ).toBeVisible();
  }
}
