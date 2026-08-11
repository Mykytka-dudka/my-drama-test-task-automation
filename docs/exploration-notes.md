# Exploration notes

Everything in this document was observed in a live browser session against `https://my-drama.com`
under mobile emulation (Pixel 7, 412x839, Android user agent) on 2026-08-10, from a Ukrainian IP.
No locator listed here was inferred from source, documentation or guesswork.

This file is the input specification for the framework: if a locator is not in here, it was not
verified, and it must not be committed.

---

## 1. Variant and region state

The app resolves experiment groups, payment provider and pricing region client-side and mirrors the
resolved state into `localStorage`. Keys are `$`-prefixed.

| Key | Observed value | First appears | Notes |
| --- | --- | --- | --- |
| `$userCountry` | `"UA"` | home load | drives currency and amount |
| `$paymentProvider` | `"solid"` | only once the paywall opens | Solidgate |
| `$abTestGroups` | `{"settingsFlowVersion":"v5"}` | only on `/settings/manage-subscription` | |
| `$isOrganicUser` | `true` | home load | gates consent behaviour |
| `$cookieConsent` | `{analytics,functional,advertisement,uncategorized}` | home load | |
| `$vipVideoIds`, `$midsForFlowWithoutUpsells`, `$continueWatchingList`, `$capiLastData` | content/analytics state | varies | not used by the suite |
| `gbFeaturesCache` | GrowthBook feature cache, ~30 KB | home load | |

`sessionStorage.is_eu` was `"false"`. Cookies set by the edge include `country=UA`, `userCountry=UA`,
`content-lang=en` and the caller IP.

### Seeding localStorage does not pin the region

Tested directly: cookies cleared, `localStorage` cleared, then `addInitScript` wrote
`$userCountry = "US"` before the first navigation.

- On the home page the seeded value survived.
- By the time the paywall rendered, the app had **overwritten it back to `"UA"`**, and the price was
  still `ГРН 99`.

Country is resolved server-side from the caller IP and rewritten into `localStorage` on load, so
client-side seeding cannot pin it. The framework therefore seeds nothing.

**Consequences for the design**

1. Prices are captured at runtime and compared against another runtime value from the same test run.
   No price is ever a constant, a fixture value or a config entry.
2. Currency is compared as a token separate from the numeric amount, so a run from a different
   country is still a valid run.
3. Flag-driven elements are branched explicitly with `count()` / `isVisible()`, never with
   `try/catch`.

### Residual variant risks

- A CI runner in another country sees a different currency and amount. Handled by design above.
- No consent banner is configured for any EU country, so an EU runner sees no consent gate
  either. Established from the vendor targeting config and confirmed by geolocation stubbing -
  see section 5.
- **`settingsFlowVersion` was `"v5"` in every observation**, and it is the only observed flag
  that can change the account flow's step sequence. Every locator on `/settings` and
  `/settings/manage-subscription` was captured under v5. A flip would change those ids, so both
  screens' assertion messages name the flag as the first thing to check.
- `$paymentProvider` was `"solid"` in every observation. A different provider would mean a different
  checkout iframe and different field names. The card form is isolated in its own page object so the
  blast radius is one class.

---

## 2. Behavioural findings

These shaped the framework more than any individual locator did.

1. **The player responds to touch, not mouse.** `click()` on `video-player-episode-selector-button`
   did nothing across three attempts, and an in-page synthetic `element.click()` also did nothing.
   `tap()` opened the episodes sheet immediately (sheet top moved from `y=839` to `y=297.6`).
   The suite uses `tap()` throughout; both device profiles set `hasTouch: true`, and `tap()` drives
   ordinary buttons correctly as well - the whole of Flow A was re-run with `tap()` end to end.
2. **The home hero banner auto-rotates.** `banner-top-slide-0` moved from `x=-616` to `x=-1236`
   within 6 s. It is a moving target and is not used as an entry point anywhere.
3. **A deep link to `/video/<uuid>` renders a different page with zero `data-testid` attributes** -
   a cover screen with a "Start watching" link. The player with its episode list only exists after
   in-app navigation. Flow B must navigate through the UI.
4. **`video-player_N` is index-suffixed** and changes as playback advances (`video-player_1` became
   `video-player_3`). It is never used as a locator.
5. **The paywall is removed from the DOM when checkout opens.** The paywall price must be captured
   before the buy button is tapped.
6. **The episodes sheet is an animated bottom sheet.** When closed it sits at `y=839` with
   `pointer-events: none`; when open it sits at `y≈297`. Its open state is what to wait for.
7. **Imperative state reads race the cross-origin payment iframe.** In one captured snapshot the card
   number field reported `count() === 0` and `isEditable() === true` at the same moment. Only
   auto-retrying web-first assertions are sound against this iframe.

---

## 3. Element inventory

`n` is the number of nodes the test id resolves to on that screen. Test ids on this site are
component-level, so duplicates are expected and are resolved by scoping to a container, never by
`.first()` / `.nth()` on a page-wide query and never by filtering on visibility.

The home page carries 827 tagged nodes across 96 distinct ids. The heaviest repeats measured
there: `series-section-item` 331 nodes, `series-section-play-button` 292,
`tinder-like-section-series-name` 20, `series-section-container` 14. The attribute is always
`data-testid`;
`data-test-id` does not occur anywhere on the site (0 nodes).

### Header

| Element | Test id | n |
| --- | --- | --- |
| Sign In | `header-sign-in-button` | 1, removed from the DOM after login |
| Avatar link to `/settings` | `header-avatar-link` | 1, absent before login |
| Burger menu | `header-burger-button` | 1 |

### Login modal

All ids below resolve to exactly 1 node.

| Element | Test id | Notes |
| --- | --- | --- |
| Modal root | `login-modal-container` | |
| E-mail field | `login-modal-email-input` | `type=email`, placeholder `email@gmail.com` |
| Submit | `login-modal-submit-button` | text "Continue with Email" |
| Marketing opt-in | `login-modal-checkbox` | left untouched by the suite |
| Close | `modal-close-button` | |
| Validation message | `input-error` | empty when valid |

Login completes immediately: no OTP, no password step, no verification modal. The modal closes and
`header-sign-in-button` is replaced by `header-avatar-link`.

**Accepted e-mail format.** `@example.com` was accepted and the address appeared verbatim in
`$user.email` and on the settings screen. `example.com` is reserved by IANA for documentation, so no
real mailbox can ever receive mail from these throwaway accounts. Collision avoidance uses a
timestamp plus random suffix, and every test generates its own address.

### Settings (`/settings`)

All 1 node: `settings-page-container`, `settings-item-email`, `settings-item-subscriptions`
(a clickable `div`, not a `button`), `settings-item-change-password`, `settings-item-preferences`,
`settings-payment-history-menu-item`, `settings-sign-out-button`.

### Manage subscription (`/settings/manage-subscription`)

All 1 node: `subscription-list-empty-description`, `subscription-list-empty-get-access-button`
(text "Get Full Access"), `settings-header-back-button`.

**Boundary condition — do not deep-link this screen.** Reached by in-app navigation (home →
avatar → settings → subscriptions), `subscription-list-empty-get-access-button` was sampled six
times per trial across five trials and resolved to exactly one node every time, 30 of 30.
Reached by a direct `page.goto('/settings/manage-subscription')`, it resolved to **two** nodes on
2 of 4 trials and produced a strict-mode violation. The suite only ever navigates in-app, so this
does not affect it — but "deep-link straight to the subscriptions screen to save a few steps" is
an obvious future shortcut, and it would break this locator intermittently.

This is the second independent reason not to deep-link into this app; the first is that
`/video/<uuid>` renders an entirely different page with no test ids at all.

### Paywall - opens as a modal, the URL does not change

| Element | Test id | n |
| --- | --- | --- |
| Root | `paywall-f1` | 1 |
| Modal chrome | `modal-container` / `modal-overlay` / `modal-content` | 1 each |
| Close | `paywall-f1-close-button` | 1 |
| Title | `paywall-f1-title` | 1 |
| Left plan column (4 weeks) | `paywall-f1-plan-column-left` | 1 |
| Right plan column (2 weeks) | `paywall-f1-plan-column-right` | 1 |
| Price | `paywall-f1-price` | **2** - scope by column |
| Auto-renew line | `paywall-f1-auto-renew` | **2** - scope by column |
| Get Access | `paywall-f1-buy-button` | **2** - scope by column |

Observed content: left column `ГРН 99`, "Auto-renews at ГРН 299 after 4 weeks"; right column
`ГРН 55`, "Auto-renews at ГРН 165 after 2 weeks".

The required "first Get Access" is the one inside the **left** column:

```
getByTestId('paywall-f1-plan-column-left').getByTestId('paywall-f1-buy-button')
```

### Checkout - opens as a modal, the URL does not change

All 1 node: `payment-modal-controller-container` (root, sits inside a `role="dialog"`),
`payment-modal-header`, `payment-modal-title` (text "Select payment method"), `payment-container`,
`credit-card-container`, `payment-form-container`, `payment-pay-button` (text "Subscribe", observed
visible and enabled), `modal-close-button`.

**The individual price rows inside `payment-container` have no test ids.** Verified structure: each
row's label and value are **siblings** under a common parent.

| Label | Value observed | Label node tag |
| --- | --- | --- |
| `Your 4-week plan` | `ГРН 299.00` | `div` |
| `Your 67% introductory discount` | `-ГРН 200.00` | |
| `Total today` | `ГРН 99.00` | `p` |
| `In 4 weeks` | `ГРН 299.00 automatically charged every 4 weeks` | `p` |

Verified locator shape - exactly 1 node for the label, both within `payment-container` and
document-wide, and exactly 1 node for the value:

```
getByTestId('payment-container')
  .getByText('Total today', { exact: true })
  .locator('xpath=following-sibling::*[1]')
```

### Which price pair matches

Paywall left column `ГРН 99` corresponds to checkout `Total today` `ГРН 99.00`.

Evidence:

- Checkout arithmetic: `Your 4-week plan ГРН 299.00` minus `discount -ГРН 200.00` equals
  `Total today ГРН 99.00`.
- The paywall's own auto-renew line reads "Auto-renews at ГРН 299 after 4 weeks", which identifies
  299 as the renewal amount and 99 as the amount charged today.
- `Total today` is the only one of the four labels whose wording does not change with the selected
  plan; "Your 4-week plan" and "In 4 weeks" both restate the plan length.

Note the formatting difference: the paywall renders `ГРН 99` and checkout renders `ГРН 99.00` for the
same amount, and the currency is a localised token placed **before** the amount. A raw string
comparison fails. Normalisation must split the currency token from the numeric amount and compare
the two separately.

### Payment iframe

`payment-form-container` contains exactly 1 iframe: `#solid-payment-form-iframe`
(`name` is identical), origin `https://form-v2.solidgate.com`. The prices, the Subscribe button and
the modal chrome all stay on the host page; only the card fields are inside the iframe.

The framework resolves the frame through the test-id container rather than the provider's own element
id, so a provider change stays contained to one class:

```
frameLocator('[data-testid="payment-form-container"] iframe')
```

No test ids exist inside the iframe. Fields expose accessible names, each resolving to 1 node, and
each verified visible, editable, not readonly and not disabled through `frameLocator`:

| Field | Accessible name | Underlying input |
| --- | --- | --- |
| Card number | `Credit Card Number` | `input[type=text]`, `inputmode=numeric` |
| Expiry | `Expiration Date` | `input[type=text]`, `inputmode=numeric` |
| CVV | `CVV` | `input[type=tel]`, `inputmode=numeric` |

Cross-origin observation works fully. No assertion in the suite needs to be weakened for the frame
boundary.

A Google Pay container was present in the DOM on Chromium. Apple Pay was **not** present in this
session. Wallet buttons vary by browser and device, so no page object depends on their presence or
absence.

### Catalogue and player (Flow B)

| Element | Test id | n | Notes |
| --- | --- | --- | --- |
| All Series link | `footer-link-all-series` | 1 | navigates to `/all-series` |
| Catalogue grid | `series-section-container` | **1 on `/all-series`**, 14 on home | the uniqueness on `/all-series` is why the flow enters there |
| Series card | `series-section-item` | 12 within that grid, 331 on home | |
| Episode sheet toggle | `video-player-episode-selector-button` | 1 | text "Ep. N/M"; **tap only** |
| Sheet root | `episodes-list-container` | 1 | closed at `y=839` with `pointer-events: none` |
| Sheet grid | `episodes-list-grid` | 1 | |
| Group tab strip | `episodes-group-navigation` | 1 | scoping container for the tabs |
| Group tabs | `episodes-group-button` | 4 | carries `data-group-index` |
| Episode button | `episodes-list-episode-button` | 20 per group | carries `data-episode-index`, `data-is-locked`, `data-is-current` |
| Lock icon | `episodes-list-episode-lock` | one per locked button | |

`data-is-locked` is a semantic attribute, not a styling class, and it is the disambiguator for
locked episodes. On the sampled series the first group was fully unlocked, locking began at
`data-episode-index="24"`, and groups 2 and 3 were fully locked. Those numbers are content-dependent
and are never hard-coded. The page object taps the **last** group tab and then the first
`[data-is-locked="true"]` episode inside it, on the domain assumption that a freemium serial puts
its free episodes first and its paid ones last. That assumption is recorded as a residual risk in
`NOTES.md`; if it ever stops holding, the assertion fails with a message saying the series may be
fully unlocked rather than with a bare locator timeout.

---

## 4. Verified flow sequences

### Flow A - account paywall

Re-run end to end with the exact locator set the framework ships, including the price comparison.

1. Open `/`.
2. `header-sign-in-button` - the login modal opens.
3. Fill `login-modal-email-input` with a freshly generated address, then `login-modal-submit-button`.
4. `header-avatar-link` appears - login is complete.
5. Tap it - navigates to `/settings`.
6. `settings-item-subscriptions` - navigates to `/settings/manage-subscription`.
7. `subscription-list-empty-get-access-button` - `paywall-f1` opens as a modal, URL unchanged.
8. Read the left column price. **Capture it now**; the paywall leaves the DOM in the next step.
9. Left column `paywall-f1-buy-button` - `payment-modal-controller-container` opens, URL unchanged.

### Flow B - content paywall

Mapped from scratch. The e-mail gate is **not** at the start of this flow.

1. Open `/`.
2. `footer-link-all-series` - navigates to `/all-series`.
3. First `series-section-item` inside the unique `series-section-container` - navigates to the player
   at `/video/<uuid>`.
4. Tap `video-player-episode-selector-button` - the episodes sheet slides open.
5. Tap the last `episodes-group-button`, then the first `[data-is-locked="true"]` episode in the
   grid.
6. `paywall-f1` opens **directly, with no e-mail gate** - the user is still anonymous here.
7. Read the left column price, then tap the left column `paywall-f1-buy-button`.
8. **The login modal appears at this point**, after the plan choice. Fill the e-mail and submit.
9. `payment-modal-controller-container` opens, with structure and price rows identical to Flow A.

---

## 5. Cookie consent

The consent widget is third-party CookieYes and has no test ids at all, so it is the one documented
exception to the test-id rule.

### What is actually configured

Rather than assume how CookieYes is usually deployed, the site's own targeting configuration was
read directly from `cdn-cookieyes.com/client_data/<id>/lYb6IdlM.json`:

- **52 rules, all pointing at a single banner** (`2186996`).
- Countries covered: the **51 US states** (`regionName IS 'NA' AND countryName IS 'US' AND
  regionCode IS '<state>'`) and **Ukraine** (`regionName IS 'EU' AND countryName IS 'UA'`).
- **No EU country is configured.** There is no GDPR accept/reject notice on this site.

That was confirmed experimentally. Stubbing CookieYes's own geolocation endpoint
`https://directory.cookieyes.com/api/v1/ip` — which normally answers
`{"ip":"…","country":"UA","in_eu":false,"continent":"EU"}` — with a German, `in_eu: true` payload
and clearing the site's own `cookieyes-consent` cookie rendered **no widget at all**: no
`.cky-consent-container`, no `data-cky-tag` elements anywhere.

### The one widget that exists

The CCPA "Opt-out Preferences" dialog, at `.cky-modal` / `#ckyPreferenceCenter`. From a Ukrainian
IP it is fully populated but hidden (`visibility: hidden`), and it only opens when the user
follows the "Do Not Sell or Share My Personal Information" link. It never blocks a run.

All 16 `data-cky-tag` elements in the DOM belong to it:

| Button | Attribute | Label |
| --- | --- | --- |
| Cancel | `data-cky-tag="optout-cancel-button"` | "Cancel" |
| Save | `data-cky-tag="optout-confirm-button"` | "Save My Preferences" |
| Close | `data-cky-tag="optout-close"` | aria-label "Close" |

`.cky-consent-container` also exists but is **empty** (`innerHTML.length === 0`) and carries
`cky-hide` with `display: none` — it is the unused notice slot, which is consistent with no
notice being configured.

Note also that my-drama.com sets its own `cookieyes-consent` cookie server-side (observed with
both `consent:no` and `consent:yes`), which independently suppresses the widget.

The framework keeps a `dismissIfPresent()` safety net on the verified `optout-cancel-button`: one
visibility check on the initial navigation, tapping only if the dialog is genuinely open. Given the above it
should never fire, and it costs nothing if it does not.

No app-redirect interstitial and no app-store smart banner exist on mobile web - verified absent.

---

## 6. Network behaviour

### First-party origins

`my-drama.com` (which serves every observed `/api/v1/...` call), plus the subdomains
`prod-api.my-drama.com`, `static.my-drama.com` and `cdn-tolik-prod.my-drama.com`. The guard
matches on the `my-drama.com` suffix, so all of them are covered.

### Third-party noise, measured

A single home page load produced two console errors, neither related to the product:

- `https://re.applovin.com/v1/s` - `net::ERR_NAME_NOT_RESOLVED`
- `https://pixel.tapad.com/idsync/...` - HTTP 403

Other third-party origins active during the flows: Sentry (`ingest.us.sentry.io`,
`sntr.solidgate-dev.com`), GrowthBook (`cdn.growthbook.io`), CookieYes
(`directory.cookieyes.com`), Stripe (`js.stripe.com`, `m.stripe.network`), Solidgate
(`form-v2.solidgate.com`), Intercom, and Google/Firebase auth. None of these may fail a paywall test.

### First-party API failures, and the two exclusions

First-party `/api/` failures are the opposite case and are surfaced loudly - a failing offerings call
is exactly what leaves the paywall spinning with no error UI. Two exclusions are carved out, both
evidence-based rather than convenience-based:

1. **`GET /api/v1/catalog/offerings/*_after_timer?provider=solid` returns 404 on every paywall
   open** - 4 observations out of 4. In the same page load the primary offering
   `.../my_drama_com_premium_f1_v1?provider=solid` returned 200 and the paywall rendered correctly
   every time. This is a speculative probe for an offering that does not exist; treating it as a
   failure would make the suite permanently red without describing any real defect.
2. **Requests aborted by navigation** (`net::ERR_ABORTED`, observed on
   `GET /api/v1/continue-watching`) are cancellations, not server failures.

Everything else on a first-party `/api/` path fails the test, and the collected entries are attached
to the report so the failure names the upstream cause instead of surfacing as a locator timeout.

### Known upstream flake

`GET /api/v1/catalog/offerings/my_drama_com_premium_f1_v1?provider=solid` intermittently returns
404, and when it does the paywall modal spins forever with no error UI. It is not excluded by the
rule above: it fails the test, with a message that names the offerings request rather than the
missing locator.

Measured behaviour, because the shape of it matters:

- It arrives in **windows**. Across one stretch of roughly twenty minutes it hit about 7 of 18
  attempts that opened the paywall from the account flow. Outside that stretch, two controlled
  probes plus a three-run validation gate produced 24 of 24 clean openings with no code change in
  between.
- Within the bad window the anonymous content flow was unaffected (about 9 of 9), which initially
  looked like a fresh-account dependency. Controlled probes disproved that: offerings returned 200
  six to seven seconds after signup, every time. The asymmetry is unexplained and may simply be
  which requests landed inside the window.
- There is no error UI and the app does not retry, so a real user in that window sees a spinner
  that never resolves.
