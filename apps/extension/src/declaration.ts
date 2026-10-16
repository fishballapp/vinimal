/**
 * A page declares Vinimal off with `<meta name="vinimal" content="off">` in its document. Each frame
 * reads its own document when a key arrives; the top frame's answer is also kept per tab, for the
 * toolbar icon.
 */

/** Whether a document declares Vinimal off. */
export const isDeclaredOff = (page: { querySelector(selectors: string): unknown }) =>
  page.querySelector('meta[name="vinimal"][content="off"]') !== null;

// The service worker stops when idle, and the icon has to show the page's answer when it wakes, so
// the answer lives in `storage.session`, as the id of the top document that declared it. A commit
// clears an answer only when it came from another document, so a report that lands before its own
// page's commit isn't lost.

const keyOf = (tabId: number) => `declared-off:${tabId}`;

const declaringDocumentOf = async (tabId: number) => {
  const key = keyOf(tabId);
  const items: Record<string, unknown> = await chrome.storage.session.get(key);
  const documentId = items[key];
  return typeof documentId === 'string' ? documentId : undefined;
};

/** What the tab's top document `documentId` says: that it declares Vinimal off, or not. */
export const setTabDeclaration = (
  tabId: number,
  { documentId, isOff }: { documentId: string; isOff: boolean },
) =>
  isOff
    ? chrome.storage.session.set({ [keyOf(tabId)]: documentId })
    : chrome.storage.session.remove(keyOf(tabId));

/** A new top document committed in the tab: an answer from any other document no longer holds. */
export const forgetOtherDocuments = async (tabId: number, documentId: string) => {
  const declaring = await declaringDocumentOf(tabId);
  if (declaring !== undefined && declaring !== documentId) {
    await chrome.storage.session.remove(keyOf(tabId));
  }
};

/** The tab is gone. */
export const forgetTab = (tabId: number) => chrome.storage.session.remove(keyOf(tabId));

export const isTabDeclaredOff = async (tabId: number) =>
  (await declaringDocumentOf(tabId)) !== undefined;
