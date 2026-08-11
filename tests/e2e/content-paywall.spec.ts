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

  // Anonymous users hit the paywall directly here; the e-mail gate only appears after the plan
  // choice below, unlike the account flow where it comes first.
  await app.paywall.expectOpen();
  const advertisedPrice = await app.paywall.readFirstPlanPrice();
  await app.paywall.tapFirstPlanBuyButton();

  await app.loginModal.expectOpen();
  await app.loginModal.signInWith(email);

  await expectCheckoutMatchesPaywall(app, advertisedPrice);
});
