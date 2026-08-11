import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { HeaderComponent } from '../components';
import { BASE_URL } from '../config';
import type { Price } from '../utils';
import { parsePrice } from '../utils';

/**
 * Base class for every page object. Owns the shared `page` handle and `baseURL`, composes the
 * components shared across screens, and provides the navigation and URL-assertion helpers every
 * page object needs.
 */
export abstract class BasePage {
  protected readonly baseURL: string = BASE_URL;

  readonly header: HeaderComponent;

  constructor(protected readonly page: Page) {
    this.header = new HeaderComponent(page);
  }

  async open(path: string): Promise<void> {
    await this.page.goto(new URL(path, this.baseURL).toString());
  }

  /**
   * Asserts the current path, tolerating a trailing slash and any query or fragment. The app
   * emits its own links with a bare `?` appended, so an exact string match is not safe here.
   */
  async expectPath(path: string, message: string): Promise<void> {
    const expectedUrl = new URL(path, this.baseURL).toString().replace(/\/$/, '');
    const pattern = new RegExp(`^${escapeForRegExp(expectedUrl)}/?(?:[?#].*)?$`);

    await expect(this.page, message).toHaveURL(pattern);
  }

  /**
   * Waits for a price node to hold an amount, then parses it. Visibility alone only proves a
   * non-empty box, so an imperative read of a node that is still a placeholder would hand
   * `parsePrice` an empty string and fail inside the parser instead of naming the screen.
   */
  protected async readPrice(locator: Locator, message: string): Promise<Price> {
    // `useInnerText` keeps the gate and the read on the same text source: `toHaveText`
    // defaults to textContent, which sees digits inside hidden subtrees that innerText drops.
    await expect(locator, message).toHaveText(/\d/, { useInnerText: true });

    return parsePrice(await locator.innerText());
  }
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
