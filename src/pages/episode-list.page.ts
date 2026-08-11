import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The episodes bottom sheet inside the player. The sheet is always present in the DOM with a
 * non-empty bounding box, so `toBeVisible()` cannot distinguish open from closed: closed, it
 * sits at `y=839` - exactly the bottom edge of the 839px viewport, entirely off-screen; open,
 * it sits at `y≈297`. `toBeInViewport` is therefore the correct wait for "open".
 */
export class EpisodeListPage extends BasePage {
  readonly sheet: Locator;
  private readonly groupTabs: Locator;
  private readonly episodeGrid: Locator;
  private readonly lockedEpisodes: Locator;

  /**
   * Free episodes sit at the start of a series and premium ones at the end, so the final group is
   * the one certain to contain locked episodes. This is a domain assumption about how the product
   * monetises, recorded as a residual risk in NOTES.md.
   */
  readonly lastGroupTab: Locator;

  /**
   * Container-scoped selections from legitimately plural sets, expressing the domain intent "the
   * first locked episode in the final group" - not disambiguation of otherwise-unique elements.
   */
  readonly firstLockedEpisode: Locator;

  constructor(page: Page) {
    super(page);
    this.sheet = page.getByTestId('episodes-list-container');
    this.groupTabs = page
      .getByTestId('episodes-group-navigation')
      .getByTestId('episodes-group-button');
    this.episodeGrid = page.getByTestId('episodes-list-grid');
    this.lockedEpisodes = this.episodeGrid
      .getByTestId('episodes-list-episode-button')
      .and(page.locator('[data-is-locked="true"]'));
    this.lastGroupTab = this.groupTabs.last();
    this.firstLockedEpisode = this.lockedEpisodes.first();
  }

  async expectOpen(): Promise<void> {
    await expect(this.sheet, 'episodes sheet never opened').toBeInViewport({ ratio: 0.5 });
  }

  /**
   * The assertion between the two taps retries while the grid re-renders after the group switch,
   * which `count()` or `isVisible()` would race. It cannot tell an incoming group's locked
   * episode from an outgoing one. In practice the sheet opens on the group covering the current
   * episode, which is near the start of the series and unlocked, so there is nothing locked on
   * screen to match prematurely - and if playback had advanced far enough for that to stop
   * holding, the episode matched would still be a locked one, which is all this method promises.
   */
  async openFirstLockedEpisode(): Promise<void> {
    await this.lastGroupTab.tap();
    await expect(
      this.firstLockedEpisode,
      'no locked episode found in the final episode group: the series may be fully unlocked',
    ).toBeVisible();
    await this.firstLockedEpisode.tap();
  }
}
