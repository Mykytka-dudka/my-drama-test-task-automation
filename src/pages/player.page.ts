import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The vertical video player at `/video/<uuid>`. Only reachable via in-app navigation from the
 * catalogue - a direct deep link to this URL renders an unrelated marketing cover screen with
 * zero `data-testid` attributes.
 */
export class PlayerPage extends BasePage {
  readonly episodeSelectorButton: Locator;

  constructor(page: Page) {
    super(page);
    this.episodeSelectorButton = page.getByTestId('video-player-episode-selector-button');
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.episodeSelectorButton,
      'player chrome never rendered: episode selector button not visible',
    ).toBeVisible();
  }

  async openEpisodeList(): Promise<void> {
    await this.episodeSelectorButton.tap();
  }
}
