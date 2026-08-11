import type { Page } from '@playwright/test';

import { CatalogPage } from './catalog.page';
import { CheckoutCardFormPage } from './checkout-card-form.page';
import { CheckoutModalPage } from './checkout-modal.page';
import { EpisodeListPage } from './episode-list.page';
import { HomePage } from './home.page';
import { LoginModalPage } from './login-modal.page';
import { ManageSubscriptionPage } from './manage-subscription.page';
import { PaywallPage } from './paywall.page';
import { PlayerPage } from './player.page';
import { SettingsPage } from './settings.page';

/**
 * The single object a spec is handed. Every page object is exposed as a lazily instantiated,
 * cached getter, so a spec never constructs one and only the screens a given test actually
 * visits are ever built.
 *
 * Adding a screen is adding one field and one getter.
 */
export class PageFactory {
  private homePage?: HomePage;
  private loginModalPage?: LoginModalPage;
  private settingsPage?: SettingsPage;
  private manageSubscriptionPage?: ManageSubscriptionPage;
  private catalogPage?: CatalogPage;
  private playerPage?: PlayerPage;
  private episodeListPage?: EpisodeListPage;
  private paywallPage?: PaywallPage;
  private checkoutModalPage?: CheckoutModalPage;
  private checkoutCardFormPage?: CheckoutCardFormPage;

  constructor(private readonly page: Page) {}

  get home(): HomePage {
    return (this.homePage ??= new HomePage(this.page));
  }

  get loginModal(): LoginModalPage {
    return (this.loginModalPage ??= new LoginModalPage(this.page));
  }

  get settings(): SettingsPage {
    return (this.settingsPage ??= new SettingsPage(this.page));
  }

  get manageSubscription(): ManageSubscriptionPage {
    return (this.manageSubscriptionPage ??= new ManageSubscriptionPage(this.page));
  }

  get catalog(): CatalogPage {
    return (this.catalogPage ??= new CatalogPage(this.page));
  }

  get player(): PlayerPage {
    return (this.playerPage ??= new PlayerPage(this.page));
  }

  get episodeList(): EpisodeListPage {
    return (this.episodeListPage ??= new EpisodeListPage(this.page));
  }

  get paywall(): PaywallPage {
    return (this.paywallPage ??= new PaywallPage(this.page));
  }

  get checkout(): CheckoutModalPage {
    return (this.checkoutModalPage ??= new CheckoutModalPage(this.page));
  }

  get checkoutCardForm(): CheckoutCardFormPage {
    return (this.checkoutCardFormPage ??= new CheckoutCardFormPage(this.page));
  }
}
