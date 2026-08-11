import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { TIMEOUTS } from '../config';
import { BasePage } from './base.page';

/**
 * The catalogue screen at `/all-series`. `series-section-container` resolves to exactly 1 node
 * here (it resolves to 14 on the home page), which is why Flow B enters through this screen
 * rather than through one of the home page's own carousels.
 */
export class CatalogPage extends BasePage {
  readonly grid: Locator;
  private readonly seriesCards: Locator;

  /**
   * A container-scoped selection from a legitimately plural set (12 cards) expressing the domain
   * intent "open the first series in the catalogue" - a deliberate choice, not a disambiguation
   * of an otherwise-ambiguous element.
   */
  readonly firstSeriesCard: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = page.getByTestId('series-section-container');
    this.seriesCards = this.grid.getByTestId('series-section-item');
    this.firstSeriesCard = this.seriesCards.first();
  }

  async expectLoaded(): Promise<void> {
    await this.expectPath('/all-series', 'catalogue did not navigate to /all-series');
    await expect(this.grid, 'catalogue grid never became visible').toBeVisible();
  }

  /**
   * The card is a `div` with no href, so its handler is attached by hydration rather than by the
   * browser. A CI trace showed a tap landing 0.1s after the client-side route change and being
   * swallowed - visible, stable and enabled, but with nothing listening yet, which no
   * actionability check can detect. The tap is therefore retried as part of the navigation
   * intent rather than waited on afterwards.
   */
  async openFirstSeries(): Promise<void> {
    await expect(async () => {
      await this.firstSeriesCard.tap();
      await expect(this.page).toHaveURL(/\/video\//, { timeout: TIMEOUTS.hydrationRetry });
    }, 'tapping the first catalogue card never opened a series').toPass({
      timeout: TIMEOUTS.navigation,
    });
  }
}
