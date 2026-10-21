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
    organizationId: '3dbc4d35-ee97-45be-afa1-ed423bded0e0',
    benefitIds: {
      oneYear: 'c519b81d-ec2b-41dc-b0df-7919eb705d12',
      supporter: '56447e33-b0a4-43ba-9d16-1bbb679a487f',
    },
    checkoutUrls: {
      oneYear: 'https://buy.polar.sh/polar_cl_kqcZkBTjBg4VpCOqCAgwVnd6a5Xi4lHjMoaip4KyttS',
      supporter: 'https://buy.polar.sh/polar_cl_FTvDakwyWfacLAP0oRcJYmpfBHgWW7tXReEMY4ZWfzb',
    },
    portalUrl: 'https://polar.sh/vinimal/portal',
  },
} as const satisfies Record<'sandbox' | 'production', PolarConfig>;
