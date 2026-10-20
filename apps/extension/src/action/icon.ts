import { isTabDeclaredOff } from '../declaration';
import { isSiteDisabled, setSiteDisabled, siteName, siteOf } from '../sites';
import { type IconState, iconPaths } from './icon-paths';

/** The icon's tooltip: what a click does. Chrome adds its own line about site access below. */
export const TITLES: Record<IconState, (hostname: string) => string> = {
  on: hostname => `Disable Vinimal on ${siteName(hostname)}`,
  off: hostname => `Enable Vinimal on ${siteName(hostname)}`,
  unavailable: () => 'Vinimal can’t run here',
  'declared-off': () => 'This site turns Vinimal off',
};

/** What a tab's icon shows. The site's own declaration beats the user's choice. */
export const iconStateOf = ({
  site,
  isDeclaredOff,
  isDisabled,
}: {
  site: { hostname: string } | undefined;
  isDeclaredOff: boolean;
  isDisabled: boolean;
}): IconState => {
  if (site === undefined) return 'unavailable';
  if (isDeclaredOff) return 'declared-off';
  return isDisabled ? 'off' : 'on';
};

/** The site a tab is on, or `undefined` where Vinimal can't run. */
export const siteOfTab = async (tabId: number) => {
  const [tab, isFileAccessAllowed] = await Promise.all([
    chrome.tabs.get(tabId).catch(() => undefined),
    chrome.extension.isAllowedFileSchemeAccess(),
  ]);
  return siteOf(tab?.url, { isFileAccessAllowed });
};

/**
 * Toggles Vinimal on or off for `tabId`'s site (used by the toolbar icon and `ZZ`), returning the
 * site's new state, or `undefined` when the page declares Vinimal off or Vinimal can't run there.
 */
export const toggleTabSite = async (
  tabId: number,
): Promise<{ hostname: string; isEnabled: boolean } | undefined> => {
  // A page that declares Vinimal off stays off: a toggle neither turns it on nor changes the list.
  if (await isTabDeclaredOff(tabId)) return undefined;
  const site = await siteOfTab(tabId);
  if (site === undefined) return undefined;
  const isDisabled = !(await isSiteDisabled(site.hostname));
  await setSiteDisabled(site.hostname, isDisabled);
  return { hostname: site.hostname, isEnabled: !isDisabled };
};

/** Sets a tab's icon and tooltip to the tab's state: see `iconStateOf`. */
export const showIconState = async (tabId: number) => {
  const site = await siteOfTab(tabId);
  const state = iconStateOf({
    site,
    isDeclaredOff: await isTabDeclaredOff(tabId),
    isDisabled: site !== undefined && (await isSiteDisabled(site.hostname)),
  });
  // The tab may close between the read and the write.
  await Promise.all([
    chrome.action.setIcon({ tabId, path: iconPaths(state) }),
    chrome.action.setTitle({ tabId, title: TITLES[state](site?.hostname ?? '') }),
  ]).catch(() => undefined);
};

export const showIconStateEverywhere = async () => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.flatMap(({ id }) => (id === undefined ? [] : [showIconState(id)])));
};
