import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/**
 * Disabled sites live in `storage.sync`, one item per hostname (`disabled:mail.google.com`), so
 * disabling or enabling one site on one machine never overwrites another's change to a different
 * site. The value is when it was disabled, in epoch ms.
 */
const PREFIX = 'disabled:';

const itemKey = (hostname: string) => `${PREFIX}${hostname}`;

export type DisabledSite = { hostname: string; disabledAt: number };

/** Every disabled site, the latest first. */
export const loadDisabledSites = async (): Promise<DisabledSite[]> => {
  const items: Record<string, unknown> = await chrome.storage.sync.get(null);
  return Object.entries(items)
    .filter(([key]) => key.startsWith(PREFIX))
    .flatMap(([key, value]) =>
      Option.match(Schema.decodeUnknownOption(Schema.Int)(value), {
        onNone: () => [],
        onSome: disabledAt => [{ hostname: key.slice(PREFIX.length), disabledAt }],
      }),
    )
    .toSorted((a, b) => b.disabledAt - a.disabledAt);
};

export const isSiteDisabled = async (hostname: string) => {
  const key = itemKey(hostname);
  const items: Record<string, unknown> = await chrome.storage.sync.get(key);
  return items[key] !== undefined;
};

export const setSiteDisabled = (hostname: string, isDisabled: boolean) =>
  isDisabled
    ? chrome.storage.sync.set({ [itemKey(hostname)]: Date.now() })
    : chrome.storage.sync.remove(itemKey(hostname));

/** The hostnames a `storage.onChanged` event for `sync` disabled or enabled. */
export const hostnamesIn = (changes: Record<string, unknown>) =>
  Object.keys(changes)
    .filter(key => key.startsWith(PREFIX))
    .map(key => key.slice(PREFIX.length));

/** A site's name as people read it: local files have no hostname. */
export const siteName = (hostname: string) => (hostname === '' ? 'local files' : hostname);

const STORE_HOSTS = new Set(['chromewebstore.google.com', 'chrome.google.com']);

/**
 * The site a tab's URL belongs to, or `undefined` where Chrome doesn't run content scripts: its own
 * pages, other extensions, the Web Store, `view-source:`, and `file:` unless the user allowed it.
 * A tab whose URL the extension can't read is one of those too.
 */
export const siteOf = (
  url: string | undefined,
  { isFileAccessAllowed }: { isFileAccessAllowed: boolean },
): { hostname: string } | undefined => {
  const parsed = url === undefined ? null : URL.parse(url);
  if (parsed === null) return undefined;
  if (parsed.protocol === 'file:') return isFileAccessAllowed ? { hostname: '' } : undefined;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  if (STORE_HOSTS.has(parsed.hostname)) {
    return parsed.hostname === 'chrome.google.com' && !parsed.pathname.startsWith('/webstore')
      ? { hostname: parsed.hostname }
      : undefined;
  }
  return { hostname: parsed.hostname };
};
