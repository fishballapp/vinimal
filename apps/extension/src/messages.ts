import type { Validation } from '@fishballapps/extension-licence/polar';

/** The extension's three pages, the options page (Keys) and its two tabs. */
export const PAGES = {
  keys: { title: 'Keys', path: 'keys.html' },
  sites: { title: 'Disabled sites', path: 'sites.html' },
  licence: { title: 'Licence', path: 'licence.html' },
} as const;

export type Page = keyof typeof PAGES;

/** Which frame shows which hint labels, for the frame that runs the hint session. */
export type HintPlan = { frameId: number; labels: string[] }[];

/** What a content script or a page asks of the service worker. */
export type WorkerMessage =
  | { type: 'hints-start' }
  /**
   * From a frame whose hints a scroll or resize changed: labels it no longer shows, and how many
   * new ones it wants. Answered with those labels, or `null` when the session is over.
   */
  | { type: 'hints-update'; released: string[]; wanted: number }
  /** Sent on to every frame of the sender's tab. */
  | { type: 'hints-broadcast'; message: HintMessage }
  | { type: 'open-tab'; url: string }
  /** `gt` and `gT`: the next or previous tab in the sender's window. */
  | { type: 'switch-tab'; direction: 1 | -1 }
  | { type: 'open-page'; page: Page }
  /** A key was pressed after the trial or licence ran out. */
  | { type: 'keys-stopped' }
  /** From the top frame, once its document is read: whether the page declares Vinimal off. */
  | { type: 'page-declaration'; isDeclaredOff: boolean }
  /** `?` in a frame, which asks the top frame to show or hide the keys. */
  | { type: 'toggle-help' }
  /** From the Keys page shown in that dialog: Esc or `?` there closes it. */
  | { type: 'close-help' }
  | { type: 'activate-licence'; key: string };

export type WorkerReply<M extends WorkerMessage> = M extends { type: 'hints-start' }
  ? HintPlan
  : M extends { type: 'hints-update' }
    ? string[]
    : M extends { type: 'activate-licence' }
      ? Validation['type']
      : null;

/** `null` when the worker failed to answer (it logs why). */
export const sendToWorker = <M extends WorkerMessage>(message: M): Promise<WorkerReply<M> | null> =>
  chrome.runtime.sendMessage(message);

/** A hint session's steps, as each frame hears them. */
export type HintMessage =
  /** Find what's clickable and answer how many. */
  | { type: 'hints-collect' }
  /** The frame's labels, for its targets in order; every frame that answered gets one. */
  | { type: 'hints-show'; labels: string[] }
  /** A frame it contains moved, so recount: what's in view may have changed. */
  | { type: 'hints-recount' }
  | { type: 'hints-filter'; typed: string; isNewTab: boolean }
  | { type: 'hints-activate'; label: string; isNewTab: boolean }
  | { type: 'hints-end' };

/** What the service worker asks of the content script in a frame. */
export type FrameMessage =
  | HintMessage
  /** To the frame running the hint session: every label now on screen, after a recount. */
  | { type: 'hints-labels'; labels: string[] }
  /** Sent to the top frame: say the keys have stopped, as the frame that heard one couldn't. */
  | { type: 'show-notice' }
  | { type: 'toggle-help' }
  | { type: 'close-help' };

export type FrameReply<M extends FrameMessage> = M extends { type: 'hints-collect' }
  ? number
  : null;

export const sendToFrame = <M extends FrameMessage>(
  { tabId, frameId }: { tabId: number; frameId: number },
  message: M,
): Promise<FrameReply<M>> => chrome.tabs.sendMessage(tabId, message, { frameId });
