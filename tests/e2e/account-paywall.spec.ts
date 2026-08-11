import { test } from '../../src/fixtures';
import { generateTestEmail } from '../../src/utils';
import { expectCheckoutMatchesPaywall } from './checkout-integrity';

test('checkout reached through the subscriptions screen shows the price the paywall advertised', async ({
  app,
}) => {
  const email = generateTestEmail();

  await app.home.openHome();
  await app.home.header.tapSignIn();
  await app.loginModal.expectOpen();
  await app.loginModal.signInWith(email);
  await app.home.header.expectSignedIn();

  await app.home.header.tapAvatar();
  await app.settings.expectLoaded();
  await app.settings.tapSubscriptions();

  await app.manageSubscription.expectLoaded();
  await app.manageSubscription.tapGetFullAccess();

  await app.paywall.expectOpen();
  const advertisedPrice = await app.paywall.readFirstPlanPrice();
  await app.paywall.tapFirstPlanBuyButton();

  await expectCheckoutMatchesPaywall(app, advertisedPrice);
});
