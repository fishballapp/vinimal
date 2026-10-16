import { isSiteDisabled, siteOf } from '../sites';
import { type IconState, iconPaths } from './icon-paths';

const nameOf = (hostname: string) => (hostname === '' ? 'local files' : hostname);

/** The icon's tooltip: what a click does. Chrome adds its own line about site access below. */
export const TITLES: Record<IconState, (hostname: string) => string> = {
  on: hostname => `Disable Vinimal on ${nameOf(hostname)}`,
  off: hostname => `Enable Vinimal on ${nameOf(hostname)}`,
  unavailable: () => 'Vinimal can’t run here',
};

/** The site a tab is on, or `undefined` where Vinimal can't run. */
export const siteOfTab = async (tabId: number) => {
  const [tab, isFileAccessAllowed] = await Promise.all([
    chrome.tabs.get(tabId).catch(() => undefined),
    chrome.extension.isAllowedFileSchemeAccess(),
  ]);
  return siteOf(tab?.url, { isFileAccessAllowed });
};

/** Sets a tab's icon and tooltip to whether Vinimal is enabled, disabled, or can't run there. */
export const showIconState = async (tabId: number) => {
  const site = await siteOfTab(tabId);
  const state: IconState = await (async () => {
    if (site === undefined) return 'unavailable';
    return (await isSiteDisabled(site.hostname)) ? 'off' : 'on';
  })();
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
