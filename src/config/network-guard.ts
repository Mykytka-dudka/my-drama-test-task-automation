/**
 * Policy for the console/network guard.
 *
 * The split is deliberate and asymmetric: third-party noise is constant on this site and
 * must never fail a paywall test, while a failing first-party API call is usually the real
 * cause of a paywall that never renders. See README for the reasoning and
 * docs/exploration-notes.md for the measurements behind it.
 */

/**
 * Anything not served from these hosts is third-party and is ignored. An allowlist of
 * first-party hosts is used rather than a blocklist of ad and analytics hosts because the
 * set of third parties on a production page changes without notice, while the set of
 * first-party hosts does not.
 */
const FIRST_PARTY_HOST_SUFFIXES: readonly string[] = ['my-drama.com'];

const API_PATH_SEGMENT = '/api/';

/**
 * The request the e-mail login fires. Waiting on it lets a failure say whether the login itself
 * failed or whether it succeeded and the UI never caught up - two different bugs.
 */
export const LOGIN_UPGRADE_PATH = '/api/v1/auth/upgrade-anonymous';

/**
 * First-party API responses that fail on every run without affecting the product.
 *
 * `*_after_timer` offerings: observed 404 on 4 of 4 paywall openings, while the primary
 * offering returned 200 in the same page load and the paywall rendered correctly. It is a
 * probe for an offering that does not exist. Treating it as a defect would make the suite
 * permanently red while describing nothing real.
 *
 * The primary offering request is deliberately NOT excluded: a 404 there is what leaves the
 * paywall spinning forever with no error UI, and the suite must report it.
 */
const IGNORED_FIRST_PARTY_API_FAILURES: readonly RegExp[] = [
  /\/api\/v\d+\/catalog\/offerings\/[^?]*_after_timer(?:\?|$)/,
];

/**
 * Requests the browser cancelled because a navigation superseded them. These are not server
 * failures and carry no signal about the product.
 *
 * Both spellings are required: Chromium reports `net::ERR_ABORTED` and WebKit reports
 * `cancelled` for the same event. A genuine server-side failure arrives as a response with a
 * status code, not as a cancelled request, so excluding cancellations hides nothing real.
 */
export const IGNORED_REQUEST_FAILURE_REASONS: readonly string[] = [
  'net::ERR_ABORTED',
  'cancelled',
];

export function isFirstPartyUrl(url: string): boolean {
  const host = safeHostname(url);

  if (host === null) {
    return false;
  }

  return FIRST_PARTY_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function isFirstPartyApiUrl(url: string): boolean {
  return isFirstPartyUrl(url) && url.includes(API_PATH_SEGMENT);
}

export function isIgnoredApiFailure(url: string): boolean {
  return IGNORED_FIRST_PARTY_API_FAILURES.some((pattern) => pattern.test(url));
}

function safeHostname(url: string): string | null {
  // Console entries can carry non-URL locations such as "<anonymous>", which URL rejects.
  // Those are not first-party API traffic, so treating them as third-party is correct.
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
