/**
 * Vinimal's one setting, in `storage.sync`: whether hints outline what they click. On unless it's
 * been switched off, so only `false` is ever stored.
 */
const OUTLINES = 'outlines';

export const loadShowsOutlines = async () => {
  const items: Record<string, unknown> = await chrome.storage.sync.get(OUTLINES);
  return items[OUTLINES] !== false;
};

export const setShowsOutlines = (showsOutlines: boolean) =>
  showsOutlines
    ? chrome.storage.sync.remove(OUTLINES)
    : chrome.storage.sync.set({ [OUTLINES]: false });

/** Whether a `storage.onChanged` event for `sync` changed the setting. */
export const changesOutlines = (changes: Record<string, unknown>) => OUTLINES in changes;
