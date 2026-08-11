import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

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

  async openFirstSeries(): Promise<void> {
    await this.firstSeriesCard.tap();
    await expect(this.page, 'tapping the first catalogue card did not open a series').toHaveURL(
      /\/video\//,
    );
  }
}
