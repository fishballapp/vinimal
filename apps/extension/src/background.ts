import { recordInstall } from '@fishballapps/extension-licence/store';
import {
  createLicenceWorker,
  LICENCE_ALARM,
  startLicenceAlarm,
} from '@fishballapps/extension-licence/worker';
import { showIconState, showIconStateEverywhere, siteOfTab, toggleTabSite } from './action/icon';
import { forgetOtherDocuments, forgetTab, setTabDeclaration } from './declaration';
import { createLabelPool, type LabelPool } from './hints/labels';
import { licenceServer } from './licence/polar';
import {
  type HintPlan,
  PAGES,
  type Page,
  sendToFrame,
  type WorkerMessage,
  type WorkerReply,
} from './messages';
import { answerSite } from './site-status';
import { hostnamesIn } from './sites';

// The service worker: the toolbar icon and its menu, the hint session's go-between for a tab's
// frames, the licence check, and the answer to Vinimal's site. Every listener is registered
// synchronously at the top level, so Chrome can wake the worker for any of them.

// --- The toolbar icon: a click disables or enables the site.

chrome.action.onClicked.addListener(async ({ id }) => {
  if (id === undefined) return;
  await toggleTabSite(id);
});

// Chrome's docs don't promise a tab's icon survives navigation, so it's set on every one. The new
// page's declaration comes from its own content script, so the last page's goes first.
chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId, documentId }) => {
  if (frameId !== 0) return;
  await forgetOtherDocuments(tabId, documentId);
  await showIconState(tabId);
});

chrome.storage.onChanged.addListener((changes, area) => {
  const isIconChange =
    (area === 'sync' && hostnamesIn(changes).length > 0) ||
    (area === 'local' && ('licence' in changes || 'installedAt' in changes));
  if (isIconChange) void showIconStateEverywhere();
});

/**
 * Shows a page in the options tab: an open one, on whichever of the three pages, is brought forward
 * and turned to `page`, so there's never a second; otherwise a new tab. The tab is found by the
 * page's own context, as `tabs.query` can't match extension URLs without the `tabs` permission.
 */
const openPage = async (page: Page) => {
  const url = chrome.runtime.getURL(PAGES[page].path);
  const [open] = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.TAB],
    documentUrls: Object.values(PAGES).map(({ path }) => chrome.runtime.getURL(path)),
  });
  if (open === undefined) {
    await chrome.tabs.create({ url });
    return;
  }
  await chrome.tabs.update(open.tabId, {
    active: true,
    ...(open.documentUrl === url ? {} : { url }),
  });
  await chrome.windows.update(open.windowId, { focused: true });
};

// --- Hints: the frames of a tab can't reach one another, so the worker asks each what it can
// hint, owns the session's labels, and passes the session's keys on to all of them. As the page
// scrolls, each frame recounts and swaps the labels it no longer shows for ones it needs.

type HintSession = { pool: LabelPool; sessionFrameId: number };

/** Each tab's open hint session. Lost if the worker is stopped, which ends the session. */
const hintSessions = new Map<number, HintSession>();

// A tab that navigates or closes takes its session with it.
chrome.webNavigation.onCommitted.addListener(({ tabId, frameId }) => {
  if (frameId === 0) hintSessions.delete(tabId);
});
chrome.tabs.onRemoved.addListener(tabId => {
  hintSessions.delete(tabId);
  void forgetTab(tabId);
});
chrome.tabs.onReplaced.addListener((_, replacedTabId) => {
  hintSessions.delete(replacedTabId);
  void forgetTab(replacedTabId);
});

const startHints = async (tabId: number, sessionFrameId: number): Promise<HintPlan> => {
  // The session exists from the start, so an end that arrives while frames are still counting
  // (Esc, a click, from any frame) deletes it, and this start then shows nothing.
  const session = { pool: createLabelPool(), sessionFrameId };
  hintSessions.set(tabId, session);
  const frames = (await chrome.webNavigation.getAllFrames({ tabId })) ?? [];
  const counts = await Promise.all(
    frames
      .toSorted((a, b) => a.frameId - b.frameId)
      .map(async ({ frameId }) => ({
        frameId,
        // A frame the content script can't run in (about:srcdoc in a sandbox, a PDF) answers nothing.
        count: await sendToFrame({ tabId, frameId }, { type: 'hints-collect' }).catch(() => null),
      })),
  );
  if (hintSessions.get(tabId) !== session) return [];
  const answered = counts.filter(
    (frame): frame is { frameId: number; count: number } => frame.count !== null,
  );
  const labels = session.pool.take(answered.reduce((total, { count }) => total + count, 0));
  const plan = answered.map(({ frameId, count }) => ({ frameId, labels: labels.splice(0, count) }));
  // Every frame that answered hears, even with no labels, so it can pick up targets a scroll shows.
  await Promise.all(
    plan.map(({ frameId, labels }) =>
      sendToFrame({ tabId, frameId }, { type: 'hints-show', labels }).catch(() => null),
    ),
  );
  return plan.filter(({ labels }) => labels.length > 0);
};

/** Every frame inside `frameId`, at any depth: a scroll there moves them all. */
const framesInside = async (tabId: number, frameId: number) => {
  const frames = (await chrome.webNavigation.getAllFrames({ tabId })) ?? [];
  const inside = (parentFrameId: number): number[] =>
    frames
      .filter(frame => frame.parentFrameId === parentFrameId)
      .flatMap(frame => [frame.frameId, ...inside(frame.frameId)]);
  return inside(frameId);
};

const updateHints = async (
  tabId: number,
  frameId: number,
  { released, wanted }: { released: string[]; wanted: number },
) => {
  const session = hintSessions.get(tabId);
  if (session === undefined) return null;
  session.pool.release(released);
  const labels = session.pool.take(wanted);
  const target = { tabId, frameId: session.sessionFrameId };
  await sendToFrame(target, { type: 'hints-labels', labels: session.pool.inUse() }).catch(
    () => null,
  );
  await Promise.all(
    (await framesInside(tabId, frameId)).map(inner =>
      sendToFrame({ tabId, frameId: inner }, { type: 'hints-recount' }).catch(() => null),
    ),
  );
  return labels;
};

/**
 * Activates the tab `direction` places along from `tab` in its window, wrapping at the ends. It
 * reads only tab IDs and positions, so it needs no `tabs` permission.
 */
const switchTab = async ({ id, windowId }: chrome.tabs.Tab, direction: 1 | -1) => {
  const tabs = (await chrome.tabs.query({ windowId })).toSorted((a, b) => a.index - b.index);
  const here = tabs.findIndex(tab => tab.id === id);
  if (here === -1) return;
  const next = tabs[(here + direction + tabs.length) % tabs.length];
  if (next?.id !== undefined) await chrome.tabs.update(next.id, { active: true });
};

const isOpenableUrl = (url: string) =>
  ['http:', 'https:', 'file:'].includes(URL.parse(url)?.protocol ?? '');

// --- The licence: an hourly alarm asks Polar once a day, and marks the icon once the trial runs out.

const licence = createLicenceWorker(licenceServer);

chrome.alarms.onAlarm.addListener(({ name }) => {
  if (name !== LICENCE_ALARM) return;
  void licence.check();
  void showIconStateEverywhere();
});

/**
 * Chrome runs content scripts only in pages loaded after the extension is, so the tabs already
 * open at an install or update get one now; after an update it takes over from the old copy
 * (content/main.ts).
 */
const injectIntoOpenTabs = async () => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async ({ id }) => {
      if (id === undefined || (await siteOfTab(id)) === undefined) return;
      // A tab can close, or navigate somewhere Vinimal can't run, in the meantime.
      await chrome.scripting
        .executeScript({ target: { tabId: id, allFrames: true }, files: ['content.js'] })
        .catch(() => undefined);
    }),
  );
};

chrome.runtime.onInstalled.addListener(({ reason }) => {
  void recordInstall();
  void startLicenceAlarm();
  void showIconStateEverywhere();
  void injectIntoOpenTabs();
  // The cheat sheet is the whole manual, so a new install opens it once.
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) void openPage('keys');
});

chrome.runtime.onStartup.addListener(() => {
  void startLicenceAlarm();
  void licence.check();
});

const answer = async (
  message: WorkerMessage,
  { tab, frameId, documentId }: chrome.runtime.MessageSender,
): Promise<WorkerReply<WorkerMessage>> => {
  switch (message.type) {
    case 'hints-start':
      return tab?.id === undefined ? [] : startHints(tab.id, frameId ?? 0);
    case 'hints-update':
      return tab?.id === undefined ? null : updateHints(tab.id, frameId ?? 0, message);
    case 'hints-broadcast':
      if (tab?.id === undefined) return null;
      if (message.message.type === 'hints-end' || message.message.type === 'hints-activate') {
        hintSessions.delete(tab.id);
      }
      await chrome.tabs.sendMessage(tab.id, message.message);
      return null;
    case 'open-tab':
      if (tab !== undefined && isOpenableUrl(message.url)) {
        await chrome.tabs.create({
          url: message.url,
          index: tab.index + 1,
          active: false,
          ...(tab.id === undefined ? {} : { openerTabId: tab.id }),
        });
      }
      return null;
    case 'switch-tab':
      if (tab !== undefined) await switchTab(tab, message.direction);
      return null;
    case 'open-page':
      await openPage(message.page);
      return null;
    case 'keys-stopped':
      if (tab?.id !== undefined) {
        await sendToFrame({ tabId: tab.id, frameId: 0 }, { type: 'show-notice' }).catch(() => null);
      }
      return null;
    case 'page-declaration':
      if (tab?.id === undefined || documentId === undefined) return null;
      await setTabDeclaration(tab.id, { documentId, isOff: message.isDeclaredOff });
      await showIconState(tab.id);
      return null;
    case 'toggle-help':
    case 'close-help':
      // The dialog lives in the top frame, whichever frame asked.
      if (tab?.id !== undefined) {
        await sendToFrame({ tabId: tab.id, frameId: 0 }, { type: message.type }).catch(() => null);
      }
      return null;
    case 'toggle-site': {
      if (tab?.id === undefined) return null;
      const toggled = await toggleTabSite(tab.id);
      if (toggled !== undefined) {
        await sendToFrame(
          { tabId: tab.id, frameId: 0 },
          { type: 'site-toggled', ...toggled },
        ).catch(() => null);
      }
      return null;
    }
    case 'activate-licence':
      return licence.activate(message.key);
  }
};

chrome.runtime.onMessage.addListener((message: WorkerMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  void Promise.try(async () => {
    try {
      sendResponse(await answer(message, sender));
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: the service worker's console is an extension's only log.
      console.error(`Vinimal couldn't answer ${message.type}`, error);
      // Replying anyway closes the sender's wait instead of leaving it on a dropped port.
      sendResponse(null);
    }
  });
  // Keeps the channel open for the asynchronous reply.
  return true;
});

// --- Vinimal's site asks whether Vinimal is on there, to say whose keys it's answering.

chrome.runtime.onMessageExternal.addListener((message: unknown, sender, sendResponse) => {
  void Promise.try(async () => {
    try {
      sendResponse(
        (await answerSite(message, sender, {
          allowsLocalhost: import.meta.env.MODE !== 'release',
          now: Date.now(),
        })) ?? null,
      );
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: the service worker's console is an extension's only log.
      console.error('Vinimal couldn’t answer its site', error);
      sendResponse(null);
    }
  });
  return true;
});
