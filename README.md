# My Drama — mobile web E2E suite

End-to-end tests for the My Drama web app (`https://my-drama.com`), covering the two routes a
user can take to the payment checkout:

- **account paywall** — sign in, open the subscriptions screen, request full access, choose a
  plan, land on checkout;
- **content paywall** — open a series from the catalogue, open its episode list, tap a locked
  episode, choose a plan, pass the e-mail gate, land on checkout.

Both specs stop at the checkout form. Nothing in this repository completes a purchase.

**Mobile web only.** Every test runs under mobile device emulation on both projects. There is no
desktop project and no desktop assertion.

## What this repository submits

The assignment asks for two things:

> In the repo add a short note: your prompts, where the AI-generated test was wrong or flaky, and
> what you corrected manually.

> What to submit: a link to a repository (GitHub / GitLab, etc.) with the Playwright autotest code
> and that note.

- **The Playwright autotest code** is this repository — two specs under `tests/e2e/`, driven
  through the page objects, fixtures and configuration under `src/`.
- **The note** is [`NOTES.md`](NOTES.md): the prompts used, where the AI-generated work turned
  out wrong or flaky, and what was corrected by hand. The full log behind it — every finding with
  the trace timeline, vendor configuration or measurement that produced it, and the prompts
  reproduced in full — is in [`docs/ai-log.md`](docs/ai-log.md).

A third document, [`docs/exploration-notes.md`](docs/exploration-notes.md), is the evidence the
suite was built from: the verified locator inventory, how many nodes each test id resolves to, the
two flow sequences step by step, and the regional behaviour discovered along the way. It is not
required by the assignment; it exists because no locator was committed here that had not first
been observed in a live browser.

## Stack

- [Playwright Test](https://playwright.dev/) driving Chromium and WebKit under device emulation
- TypeScript with `strict` enabled — `tsc --noEmit` is the only static-analysis gate in this
  project

## Prerequisites

- Node.js 22 or newer (CI pins 22)
- `npm ci`, which requires the committed `package-lock.json`

## Install

```bash
npm ci
npx playwright install --with-deps chromium webkit
```

## Run

```bash
npm test              # both projects
npm run test:chrome   # mobile-chrome only
npm run test:safari   # mobile-safari only
npm run test:headed   # both projects, headed
npm run test:debug    # Playwright inspector
npm run report        # open the last HTML report
npm run typecheck     # tsc --noEmit
```

`BASE_URL` overrides the target and defaults to `https://my-drama.com`. `CI` is read too, and
switches on retries, a fixed worker count and `forbidOnly`.

```bash
BASE_URL=https://my-drama.com npm test
```

## Layout

```
src/
  pages/        one class per screen, plus base.page.ts and page-factory.ts
  components/   components shared across screens (header, cookie consent)
  fixtures/     the app, consoleGuard and consentGuard fixtures, and the guard itself
  config/       base URL, device profiles, timeouts, network-guard policy
  utils/        pure helpers: test e-mail generation, price parsing
tests/
  e2e/          the two spec files, plus the shared checkout assertion helper
docs/
  exploration-notes.md   verified locator inventory and variant reconnaissance
  ai-log.md              the full log behind NOTES.md, and the prompts
```

`tests/e2e/checkout-integrity.ts` is a shared assertion helper, not a spec. Playwright's default
`testMatch` is `**/*.@(spec|test).?(c|m)[jt]s?(x)`, which this filename does not match, so it is
never picked up as a test file. Naming it `*.test.ts` would be.

The documents introduced above sit alongside the code: `docs/exploration-notes.md` for what was
observed, `NOTES.md` for how the suite was built and corrected, `docs/ai-log.md` for the evidence
behind it.

## Architecture decisions

### Page objects and the factory

One class per screen or self-contained component. Every locator is declared exactly once as a
`readonly` field assigned in the constructor, so no selector string appears inside a method body
and there is a single place to change when the product moves. Actions and assertions are
separate, explicitly named methods (`tapGetFullAccess()`, `expectOpen()`) and no method returns
`this` — there is no fluent chaining to obscure what a step does.

`src/pages/page-factory.ts` exposes every page object as a lazily instantiated, cached getter,
injected into specs by a single `app` fixture. A spec never constructs a page object, only the
screens a test actually visits are ever built, and adding a screen is adding one getter.

The result is that a spec reads like a manual test case, with no selectors and no direct `page.*`
calls — see `tests/e2e/account-paywall.spec.ts`.

### Locator strategy

`data-testid` first, always. Coverage is good: 827 tagged nodes across 96 distinct ids on the
home page alone.

Test ids on this site are **component-level, not instance-level**, so duplicates are expected and
normal. On the home page `series-section-item` resolves to 331 nodes and
`series-section-play-button` to 292; on the paywall, `paywall-f1-price`, `paywall-f1-auto-renew`
and `paywall-f1-buy-button` each resolve to 2 — one per plan column. Filtering by visibility does
not disambiguate them. Every such id is therefore scoped to the nearest stable **container** test
id:

```ts
this.firstPlanColumn = page.getByTestId('paywall-f1-plan-column-left');
this.firstPlanBuyButton = this.firstPlanColumn.getByTestId('paywall-f1-buy-button');
```

A page-wide `getByTestId(...).first()` would be a defect, not a workaround.

The paywall has **two live designs**, and which one appears is decided by a running experiment —
see the risk list below. `PaywallPage` models both: the `f1` design with its two plan columns, and
the `not_sure` design, which has no plan columns and no price node at all, both amounts sitting
inside its subscribe button.

Where a repeating element carries a semantic state attribute, that attribute is the
disambiguator rather than an index: locked episodes are selected through `data-is-locked`, which
is what removes the index guesswork - the suite never needs to know which episode number a series
stops being free at. It does still assume that a freemium serial puts its paid episodes last, since
it taps the final group tab before looking for a locked episode; that assumption is listed as a
residual risk in `NOTES.md`.

**No CSS class is ever used as an anchor in the app's own markup.** It is Tailwind-only, so its
class tokens describe appearance and change whenever the design does. The one exception is the
third-party CookieYes widget, which carries no test ids at all: its controls are anchored on
`data-cky-tag`, a stable semantic attribute the vendor emits, and its overlay on `.cky-overlay`,
because that element offers no other handle. Both are called out in the component's docblock.

What that widget is was established from CookieYes's own targeting configuration rather than
assumed: 52 rules, one banner, covering the 51 US states and Ukraine, and **no EU country at all**
— so this site has no GDPR accept/reject notice, which stubbing the vendor's geolocation endpoint
with an EU payload confirmed.

The CCPA "Opt-out Preferences" dialog it does deploy behaves very differently by region. From
Ukraine it stays hidden. **From the United States it opens on load and blocks the whole page** —
`.cky-overlay` covers the viewport at `z-index: 99999999`, and every tap fails with "intercepts
pointer events". Because a third-party script injects it asynchronously, a one-shot check after
navigation loses the race. The suite arms `page.addLocatorHandler` on the overlay before the first
navigation, so the dismissal fires whenever the overlay actually blocks an action, on any screen
and however late it appears.

The checkout price rows have no test ids either. They are reached by anchoring on the stable
label text and traversing structurally to the sibling that holds the value:

```ts
page.getByTestId('payment-container')
  .getByText('Total today', { exact: true })
  .locator('xpath=following-sibling::*[1]');
```

The anchor is the label, never the price — the price is the volatile value under test.

### `tap()` rather than `click()`

Every interaction in the suite uses `tap()`. This is not stylistic: the player screen ignores
mouse events entirely. Three `click()` calls on the episode-selector control, plus an in-page
synthetic `element.click()`, all left the episodes sheet closed; `tap()` opened it immediately.
Both device profiles set `hasTouch: true`, and `tap()` drives ordinary buttons correctly, so the
suite uses it uniformly rather than special-casing one screen.

### The checkout spans two zones, so it is two page objects

The card fields live inside a cross-origin payment-provider iframe, while the prices, the
Subscribe button and the modal chrome stay on the host page. `CheckoutModalPage` models the host
half; `CheckoutCardFormPage` is rooted at a `FrameLocator` resolved once in its constructor,
scoped through the `payment-form-container` test id rather than the provider's own element id, so
a change of payment provider is contained to that one class - the frame handle plus the three
accessible field names.

Cross-origin observation works fully here, so the card fields are asserted with `toBeVisible()`
**and** `toBeEditable()` — the latter is what proves a field is neither disabled nor readonly.
Visibility alone would be an assertion that passes without proving anything.

### Prices are captured at runtime, never configured

The expected price is read from the paywall inside the same test and passed forward to the
checkout assertion. It is never a constant and never a config value, because currency and amount
are region-dependent — a Ukrainian session shows `ГРН`, a CI runner elsewhere will not.

Pinning the region by seeding `localStorage` before the first navigation was tested and **does
not work**: the seeded `$userCountry` survives the home page and is then overwritten from
server-side geo before the paywall renders. So the suite compares one runtime value against
another runtime value instead, normalising both through `parsePrice` and comparing the currency
token and the numeric amount separately. This matters because the same amount renders as
`ГРН 99` on the paywall and `ГРН 99.00` in checkout: a raw string comparison fails by
construction.

### Waiting

Every locator assertion is web-first and carries an explicit failure message. Two assertions are
value-level rather than locator-level, and both still carry one: the settled price comparison in
`tests/e2e/checkout-integrity.ts`, which uses `expect.poll` and takes its message in the options
bag, and the login response check in `LoginModalPage.signInWith()`, which takes it as the second
argument.

No fixed sleeps and no `waitForLoadState('networkidle')`. There is exactly one `catch` in the
repository - `safeHostname` in `src/config/network-guard.ts`, where a non-URL console location is
not first-party API traffic and treating it as third-party is correct - and it carries a comment
saying so.

The episodes sheet is the interesting case. It is always present in the DOM with a non-empty
bounding box, and when closed it sits exactly at the bottom edge of the viewport — entirely
off-screen but still "visible" to Playwright. `toBeVisible()` therefore cannot tell open from
closed, and the suite asserts `toBeInViewport({ ratio: 0.5 })` instead.

Two waits are not assertions, because the thing being waited on is not a rendered state:

- **A tap that nothing is listening to.** Catalogue cards are `div`s with no href, so until the
  app attaches a handler there is nothing to click — and a trace showed a tap landing 0.1s after a
  client-side route change and being swallowed. Every actionability check passed, because none of
  them can see whether a listener exists. Waiting longer cannot fix a tap that was never heard, so
  `CatalogPage.openFirstSeries()` retries the navigation intent with `expect(...).toPass()`.
- **A login whose UI never catches up.** `LoginModalPage.signInWith()` waits for the login request
  and asserts it succeeded before the header is checked, so a failure states whether the login
  failed or whether it succeeded and the header stayed signed out — two different bugs that look
  identical from the header alone.

Where an element may legitimately be absent, the code branches on an explicitly settled state
rather than catching a timeout — see `signInIfPrompted()`, which runs only after a wait on
"paywall or login gate, whichever arrives".

### The suite never completes a purchase

`expectSubscribeClickable()` asserts the Subscribe button is visible and enabled and then leaves
it alone. No code in this repository taps it or fills a card field.

## Console and network guard

`consoleGuard` is an automatic fixture in `src/fixtures/index.ts`, so it applies to every test
and no spec ever registers a page listener itself. Its classification policy lives in
`src/config/network-guard.ts`.

It is a reporting tool, not a gate.

**Third-party noise is ignored entirely.** It is real and constant here: a single home page load
reliably produces an ad pixel failing DNS resolution and a 403 from an id-sync pixel, and the
flows also touch analytics, error-reporting, consent, wallet and payment-provider origins. None
of that says anything about whether the paywall works, and none of it may fail a paywall test.
The filter is an allowlist of first-party host suffixes rather than a blocklist of ad and
analytics hosts, because the set of third parties on a production page changes without notice
while the set of first-party hosts does not.

**First-party traffic is collected and reported, and decides nothing.** Every first-party API
failure, first-party console error and uncaught page error is gathered and attached to the HTML
report as `first-party-diagnostics`. None of them fails a test.

That is a deliberate reversal. The guard originally failed a test on any failed first-party
`/api/` response, on the reasoning that a failing offerings request is what leaves the paywall
spinning forever. Measurement did not support it:

- the `*_after_timer` offerings probe 404s on **every** paywall opening while the flow is fine;
- WebKit reports navigation-cancelled requests as `cancelled`, which turned a healthy run red;
- and finally the primary offerings call returned 404 while the paywall rendered, the price
  matched and checkout showed its card form — a completed, fully asserted journey marked as
  failed. The app requests that endpoint more than once per session and recovers.

A failed request is not a failed journey, and a suite that cannot tell the difference trains
people to ignore it. Three false reds in as many days is a design answer, not bad luck.

**Where a request genuinely gates a step, the step asserts it.** `PaywallPage.expectOpen()` names
the offerings endpoint in its own failure message, so a paywall that really does hang still fails
with the cause spelled out — and the attachment sits next to it as evidence. That keeps the
diagnostic value, which was the point, without letting backend noise decide whether a user
journey passed.

Backend health belongs to monitoring owned by the teams that own those services, not to a
checkout test in someone else's pipeline.

## Known variant and flake risks

The full list, with the evidence behind each, is in `NOTES.md`. In short:

- **Region-dependent pricing cannot be pinned.** Currency and amount differ by runner location,
  which is why every price assertion is relative rather than absolute.
- **The checkout price rows are anchored on the English label `Total today`.** Those rows have no
  test ids, so a label anchor is the only option; a runner in a locale that changes the interface
  language would break it.
- **The paywall has two live designs.** Outside the United States the vendor configuration
  forces `f1_paywall`; inside it, a 50/50 experiment draws between `f1_paywall` and `not_sure`
  per user id, so a fresh account draws again on every attempt. Both designs are modelled, so
  the draw no longer decides whether a run passes.
- **The settings flow is A/B-versioned**, and only `settingsFlowVersion: v5` was ever observed.
  It is the only observed flag that can change the account flow's step sequence; both affected
  screens name it in their failure messages rather than branching on an unseen variant.
- **The consent overlay is region-dependent.** It blocks every interaction from the United States
  and never appears from Ukraine, so a local run exercises the quiet path and CI exercises the
  blocking one.
- **The content flow's e-mail gate moves.** It comes after the plan choice from Ukraine and before
  the paywall from the United States. The spec waits on whichever screen arrives and signs in only
  when the gate is the one showing.
- **The locked-episode step assumes paid episodes come last**, since it taps the final episode
  group before looking for one. It holds for a freemium serial and fails with a message saying the
  series may be fully unlocked if it ever stops holding.
- **`parsePrice` misreads the five three-decimal currencies** (KWD, BHD, OMR, TND, JOD), and it
  compares currency tokens for exact equality. Neither matters while both sides of the comparison
  come from the same page load in the same locale; both are recorded in `NOTES.md`.
- **Login can succeed while the header stays signed out.** Observed once on WebKit in CI: the
  submit landed, the request carried the right address, the API returned 200, and the header kept
  offering Sign In for the next 48 seconds. Upstream, intermittent, and reported rather than
  retried around.
- **The offerings API intermittently 404s** and leaves the paywall spinning with no error UI. It
  arrives in windows: one stretch of roughly twenty minutes hit about 7 of 18 paywall openings,
  while controlled probes and the validation gate either side of it produced 24 of 24 clean. This
  is an upstream defect, not a test defect. When it actually stops the paywall from rendering the
  test fails at `expectOpen()`, whose message names the endpoint; when the app recovers from it,
  the run stays green and the 404 appears only in the attached diagnostics.
- **Do not deep-link into the app.** `/video/<uuid>` renders an entirely different page with no
  test ids, and a direct `page.goto` to the subscriptions screen intermittently duplicates the
  Get Full Access button. Both flows navigate through the UI for this reason.

## CI

`.github/workflows/e2e.yml` runs on pushes to `main`, on pull requests, and on manual dispatch,
with in-progress runs cancelled per ref. It checks out the repository, sets up Node 22 with npm
caching, installs dependencies with `npm ci`, installs Chromium and WebKit with their system
dependencies, runs the typecheck, then runs both mobile projects. The HTML report and
`test-results/` are uploaded with `if: always()` so a failing run still produces artifacts, with a
14-day retention.

## Test data and production safety

There is no staging environment, so the suite runs against production.

Each test generates its own e-mail address at `@example.com`, a domain IANA reserves for
documentation, so no throwaway account can ever reach a real mailbox. Because every test creates
its own account and shares no state with any other, the specs are safe to run in parallel and
repeatable without manual cleanup. There is no cleanup path — each run leaves one account per
test behind, so keep the run count deliberate.

**CI is by far the largest source of those accounts.** The workflow triggers on every push to
`main` and every pull request and runs 4 tests with 2 retries, so one bad run can create up to 12
accounts. That is a deliberate trade: this suite is only meaningful against production, and a
paywall suite that never runs on a pull request is not doing its job. On a busy repository it is
worth narrowing the triggers to `workflow_dispatch` plus a path or label filter — nothing in the
framework depends on the current ones.
