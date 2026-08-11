import { test } from '../../src/fixtures';
import { generateTestEmail } from '../../src/utils';
import { expectCheckoutMatchesPaywall } from './checkout-integrity';

test('checkout reached from a locked episode shows the price the paywall advertised', async ({ app }) => {
  const email = generateTestEmail();

  await app.home.openHome();
  await app.home.tapAllSeries();
  await app.catalog.expectLoaded();
  await app.catalog.openFirstSeries();

  await app.player.expectLoaded();
  await app.player.openEpisodeList();
  await app.episodeList.expectOpen();
  await app.episodeList.openFirstLockedEpisode();

  // The e-mail gate sits either side of the plan choice depending on the region: before the
  // paywall from the United States, after it from Ukraine. Asking at both points keeps one spec
  // valid for both, and each call is a no-op where the gate is not showing.
  await app.paywall.expectOpenOrLoginPrompted();
  await app.loginModal.signInIfPrompted(email);

  await app.paywall.expectOpen();
  const advertisedPrice = await app.paywall.readFirstPlanPrice();
  await app.paywall.tapFirstPlanBuyButton();

  await app.checkout.expectRenderedOrLoginPrompted();
  await app.loginModal.signInIfPrompted(email);

  await expectCheckoutMatchesPaywall(app, advertisedPrice);
});
