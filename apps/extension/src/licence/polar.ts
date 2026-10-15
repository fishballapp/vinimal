import type { LicenceServer } from '@fishballapps/extension-licence/polar';
import { POLAR, type PolarConfig } from './polar-config';

export const polar: PolarConfig =
  import.meta.env.MODE === 'release' ? POLAR.production : POLAR.sandbox;

export const licenceServer: LicenceServer = {
  api: polar.api,
  organizationId: polar.organizationId,
  benefitIds: [polar.benefitIds.oneYear, polar.benefitIds.supporter],
};

/** The prices both products carry, in whole units of each currency. */
export const PRICES = {
  oneYear: { minimum: { USD: 0, GBP: 0, EUR: 0 }, suggested: { USD: 2, GBP: 2, EUR: 2 } },
  supporter: { minimum: { USD: 5, GBP: 5, EUR: 5 }, suggested: { USD: 10, GBP: 10, EUR: 10 } },
} as const;
