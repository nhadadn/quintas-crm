import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { PasswordRecoveryPage } from './pages/PasswordRecoveryPage';
import { PaymentPage } from './pages/PaymentPage';
import { ProfilePage } from './pages/ProfilePage';

type MyFixtures = {
  loginPage: LoginPage;
  portalPage: PortalPage;
  passwordRecoveryPage: PasswordRecoveryPage;
  paymentPage: PaymentPage;
  profilePage: ProfilePage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  portalPage: async ({ page }, use) => {
    await use(new PortalPage(page));
  },
  passwordRecoveryPage: async ({ page }, use) => {
    await use(new PasswordRecoveryPage(page));
  },
  paymentPage: async ({ page }, use) => {
    await use(new PaymentPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});

export { expect } from '@playwright/test';
