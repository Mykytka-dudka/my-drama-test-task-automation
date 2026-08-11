import type { Page } from '@playwright/test';

import {
  IGNORED_REQUEST_FAILURE_REASONS,
  isFirstPartyApiUrl,
  isFirstPartyUrl,
  isIgnoredApiFailure,
} from '../config';

export interface GuardFindings {
  apiFailures: string[];
  consoleErrors: string[];
  pageErrors: string[];
}

/**
 * Watches a page for problems that originate from the product itself, and ignores everything
 * else. Third-party noise on this site is constant and unrelated to the paywall — a single
 * home page load reliably produces an ad-pixel DNS failure and a 403 from an id-sync pixel —
 * so nothing served from a third-party host is ever collected here.
 *
 * `apiFailures` is the only category that fails a test. See README for why the threshold sits
 * there, and src/config/network-guard.ts for the two evidence-backed exclusions.
 */
export class FirstPartyGuard {
  private readonly apiFailures: string[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly pageErrors: string[] = [];

  constructor(page: Page) {
    page.on('response', (response) => {
      const url = response.url();

      if (response.status() >= 400 && isFirstPartyApiUrl(url) && !isIgnoredApiFailure(url)) {
        this.apiFailures.push(`HTTP ${response.status()} ${url}`);
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      const reason = request.failure()?.errorText ?? 'unknown';

      if (
        isFirstPartyApiUrl(url) &&
        !isIgnoredApiFailure(url) &&
        !IGNORED_REQUEST_FAILURE_REASONS.includes(reason)
      ) {
        this.apiFailures.push(`${reason} ${url}`);
      }
    });

    page.on('console', (message) => {
      const url = message.location().url;

      // The same exclusions apply here: Chromium logs a console error for the benign
      // `_after_timer` 404, and reporting it would attach a diagnostics artefact to every run.
      if (message.type() === 'error' && isFirstPartyUrl(url) && !isIgnoredApiFailure(url)) {
        this.consoleErrors.push(message.text());
      }
    });

    // Uncaught exceptions carry no reliable origin, so a third-party script's throw looks
    // identical to the app's own. They are reported for diagnosis but never fail a test.
    page.on('pageerror', (error) => {
      this.pageErrors.push(error.message);
    });
  }

  get failedApiRequests(): readonly string[] {
    return this.apiFailures;
  }

  hasFindings(): boolean {
    return (
      this.apiFailures.length > 0 || this.consoleErrors.length > 0 || this.pageErrors.length > 0
    );
  }

  findings(): GuardFindings {
    return {
      apiFailures: [...this.apiFailures],
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
    };
  }
}
