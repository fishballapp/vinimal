export type PolarConfig = {
  api: string;
  organizationId: string;
  /** A key from either product works: One year's expires after a year, Supporter's with its subscription. */
  benefitIds: { oneYear: string; supporter: string };
  checkoutUrls: { oneYear: string; supporter: string };
  portalUrl: string;
};

/**
 * Which Polar organization a build talks to. Every build uses the sandbox except `build:release`
 * (Vite's `release` mode), so any other build can be tested end to end with a sandbox key.
 */
export const POLAR = {
  sandbox: {
    api: 'https://sandbox-api.polar.sh',
    organizationId: '06b3e001-297b-4ebd-bd97-c2008176dde0',
    benefitIds: {
      oneYear: 'b4e412d5-9a75-455a-9eb7-1bca9c8ceccc',
      supporter: '82a50558-1ccd-4147-a9f9-86f91240981c',
    },
    checkoutUrls: {
      oneYear:
        'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_98GKMugTmSdaypPyMFi2p4jAQXQtyepu7GhG30uftpe/redirect',
      supporter:
        'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_lcOffu3sxGb2VP8wv7kUguebzafEjB0a0i4Lg0sU1oh/redirect',
    },
    portalUrl: 'https://sandbox.polar.sh/fishball-ltd/portal',
  },
  production: {
    api: 'https://api.polar.sh',
    organizationId: 'af3e0e60-236e-43cc-94e4-468e00c9f7b7',
    benefitIds: {
      oneYear: '78514f71-3716-4aaf-b96f-fe595e12272f',
      supporter: '9c37a0a1-7fd7-4361-a27f-27203968457d',
    },
    checkoutUrls: {
      oneYear: 'https://buy.polar.sh/polar_cl_9shwZoqlpZrfoTtfwwNSxwYZ8SsdhH3HT1MLn4a3swK',
      supporter: 'https://buy.polar.sh/polar_cl_fiKCcnDbYF9LFNxbYApNgjwPiQorzN6qWDAF31yVZqB',
    },
    portalUrl: 'https://polar.sh/fishball-ltd/portal',
  },
} as const satisfies Record<'sandbox' | 'production', PolarConfig>;
