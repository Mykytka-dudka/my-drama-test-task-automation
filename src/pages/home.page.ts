import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * The home screen at `/`. Sign-in is reached through the inherited `header` component, so this
 * class only owns the footer entry point into the catalogue.
 */
export class HomePage extends BasePage {
  readonly allSeriesLink: Locator;

  constructor(page: Page) {
    super(page);
    this.allSeriesLink = page.getByTestId('footer-link-all-series');
  }

  async openHome(): Promise<void> {
    await this.open('/');
  }

  async tapAllSeries(): Promise<void> {
    await this.allSeriesLink.tap();
  }
}
