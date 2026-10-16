/**
 * Vinimal's own site, vinimal.fishball.app: the pages allowed to ask the extension something
 * (`externally_connectable`), and the IDs it finds the extension by. No imports, so the build's
 * config can read it too.
 */

const SITE_ORIGIN = 'https://vinimal.fishball.app';

/** The store's item, and every other build, which carries `DEV_PUBLIC_KEY` for a fixed ID. */
export const EXTENSION_IDS = {
  store: 'idnlikpoaijiddnpfngpmjflmdjndhmo',
  dev: 'idmbinogldjhklakideijbhkkpclppgb',
} as const;

/**
 * The manifest `key` of every build but the release one, so an unpacked build has the same ID
 * wherever it's loaded from and the site can find it. Only its public half exists: an unpacked
 * extension needs nothing else.
 */
export const DEV_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuGCcHjiJ8KFrnIGPCFPAkqR/b0TCmbeHTjubx8Z0zW9AFP0blbpzshUMK2wnBBvYmHo9iZEqyUzxMLgsgUKiV3TjQT2s3MNzIeIIiKsklW7irFJXvyDog/vT4C78IWFxzwzjQIeZv3p2gko5FogcIeF89PU9Fb0+0njn+Jd2QQfbeJ4NPOlNEwJ2WWfXMbYOA7lgrnFyrY4zEax9DTF4p0deocXIHEnZFwH/1XTIt1nKgzucm0SgxUK2ZNwPklUUjz3o0USXPD7sb+4uyD2ViZgF0+bTvsVyA9PyJAGdAOFH3xR7wt2/thk28/UcpeZlEU3N4n+PLM8jB579q6QtGwIDAQAB';

/** The pages that may ask: the site, and in a build that isn't a release, the site's dev server. */
export const siteMatches = ({ allowsLocalhost }: { allowsLocalhost: boolean }) => [
  `${SITE_ORIGIN}/*`,
  ...(allowsLocalhost ? ['http://localhost/*'] : []),
];

/** The hostname Vinimal is switched on or off for, when `origin` is one allowed to ask. */
export const siteHostnameOf = (
  origin: string | undefined,
  { allowsLocalhost }: { allowsLocalhost: boolean },
) => {
  const url = URL.parse(origin ?? '');
  if (url === null) return undefined;
  if (url.origin === SITE_ORIGIN) return url.hostname;
  return allowsLocalhost && url.protocol === 'http:' && url.hostname === 'localhost'
    ? url.hostname
    : undefined;
};
