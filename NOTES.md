# NOTES

The note the assignment asks for: the prompts used, where the AI-generated work turned out wrong
or flaky, and what was corrected by hand.

Each finding below is one line of a longer entry. The full log — every one with the trace
timeline, vendor config or measurement that produced it, plus the prompts reproduced in full — is
in [`docs/ai-log.md`](docs/ai-log.md).

## Prompts

Eight in total, all reproduced in `docs/ai-log.md` and lightly redacted (absolute paths replaced
with `<repo>`, machine- and account-specific details removed):

- **one originating brief**, written by hand: the architecture contract, the locator rules, the
  two flows to cover, and the constraint that no locator may be committed unless it was first
  observed in a live browser;
- **six delegation briefs** derived from it, one per module, each carrying the exact file list,
  the already-verified locators and the rules verbatim;
- **one reviewer prompt**, run three times against the finished repository by a fresh reviewer
  with no prior context.

## Where it was wrong, and what was corrected

### Confident locator choices that were simply false

- **`click()` does nothing on the player.** Three attempts plus an in-page synthetic click all
  left the episodes sheet closed; `tap()` opened it immediately. The whole suite uses `tap()`.
- **The hero banner auto-rotates** — 620 px in six seconds. A clean unique test id, and an
  unusable entry point. The flow enters through the catalogue instead.
- **Deep links render a different page with zero test ids.** `/video/<uuid>` opened directly is a
  marketing cover screen. Both flows navigate through the UI.
- **`video-player_N` is index-suffixed** and changes as playback advances. Never a locator.

### Assertions that would have passed without proving anything

- **`isEditable()` returned `true` while `count()` returned `0`** on the same node in the same
  snapshot. Imperative reads race the cross-origin payment iframe; only auto-retrying web-first
  assertions are sound there.
- **`toBeVisible()` cannot tell the episodes sheet is closed** — closed, it sits exactly at the
  viewport's bottom edge, off-screen but still "visible". Replaced with `toBeInViewport`.
- **The price comparison had no retry.** The checkout total is computed (plan − discount), so a
  two-phase render would have failed with "299 did not match 99" — a false pricing defect, the
  worst possible message for that particular test. Now polled until it settles.

### Diagnoses that were wrong — including several of my own

- **"Seeding `localStorage` pins the region."** The highest-value stability idea available, and
  false: the seeded country survives the home page and is overwritten by server-side geo before
  the paywall renders. No seeding exists in this repo; every price is captured at runtime.
- **"The offerings 404 is a fresh-account problem."** Seven failures in eighteen looked
  convincing. Controlled probes on the same path returned twelve of twelve clean. It is an
  intermittent upstream window, and the fix that hypothesis implied would have papered over
  someone else's bug.
- **"The consent dialog never blocks a run."** True from Ukraine, false from the United States,
  where it covers the viewport and every tap fails on it. I had read the vendor's targeting config
  myself, seen the 51 US rules, and still generalised one country into all of them.
- **"That failure is a swallowed tap."** It looked exactly like the hydration race fixed next to
  it. The trace showed the request body carrying the right address and the API returning 200 — the
  login completed and the UI stayed signed out. A retry would have hidden a real product bug.

### Test bugs I introduced and then removed

- **`waitForResponse` hung for the full 180-second test timeout.** Added to tell a failed login
  apart from a login the UI ignored; it resolves on a *response*, so a request failing at the
  network level never resolves it, and with no action timeout configured it had no budget of its
  own. It caused 6 of 18 failures in a 40-run repeat. Removed — the report already carried that
  distinction.
- **Splitting an assertion silently shortened its wait** from 75 s to 20 s, failing a run whose
  payment iframe merely arrived late.
- **The network guard failed tests on API failures the app recovered from.** Three false reds in
  three days, each patched with another exclusion. It now collects and attaches; the steps decide.

### What only CI could find

Three adversarial review rounds found real defects and none of these, because all three read the
same repository from the same country. The first CI run, from a US-based runner, immediately
produced two findings more serious than anything review caught: the consent overlay blocking every
interaction, and the content flow's e-mail gate appearing *before* the paywall rather than after.
A later run traced the retries to a live 50/50 A/B experiment on the paywall design, read out of
the vendor's own configuration.

## Known residual risks

- The paywall has two live designs: outside the US one is forced, inside it is a 50/50 draw per
  user id. Both are modelled, but only CI exercises the second.
- The consent overlay and the gate ordering are region-dependent — local runs exercise the quiet
  path, CI the blocking one.
- The offerings endpoint 404s in windows. When it stops the paywall from rendering the test fails
  and names it; when the app recovers, the 404 appears only in the attached diagnostics.
- Login can succeed while the header stays signed out on WebKit — upstream, reported not retried.
- The checkout price rows are anchored on the English label `Total today`; those rows carry no
  test ids, so a label anchor is the only option available.
- `parsePrice` misreads the five three-decimal currencies, and currency tokens are compared for
  exact equality. Neither matters while both values come from the same page load.
- A first-party API failure no longer fails a test. A backend outage the UI survives will not be
  caught here — that belongs to monitoring.

## Validation

- `npm run typecheck` clean.
- Full suite green on `mobile-chrome` and `mobile-safari` across three consecutive runs, and green
  in CI with no retries.
- A 40-run local repeat during an active upstream window gave 18 failures: 12 carried the
  offerings 404 in their own diagnostics attachment, 6 were the `waitForResponse` regression since
  removed.
- Three adversarial review rounds, each by a fresh reviewer with no prior context.
