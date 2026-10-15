import { loadLicensing } from '@fishballapps/extension-licence/store';
import { createHintFrame } from '../hints/frame';
import { type HintSession, startHintSession } from '../hints/session';
import { repeats } from '../keys/commands';
import { createDispatcher } from '../keys/dispatch';
import { leaveTextField, readKey, targetOf } from '../keys/text-field';
import { stoppedReason } from '../licence/stopped';
import { type FrameMessage, sendToWorker } from '../messages';
import { rememberActivated } from '../scroll/scrollable';
import { createScroller } from '../scroll/scroller';
import { changesOutlines, loadShowsOutlines } from '../settings';
import { hostnamesIn, isSiteDisabled } from '../sites';
import type { Dialog } from '../ui/overlay/dialog';
import { showHelp } from '../ui/overlay/help';
import { showNotice } from '../ui/overlay/notice';

// The content script, in every frame of every page. It decides nothing about the page until it
// knows whether the site is enabled, and takes a key only when it's one of Vinimal's.

// One copy runs per frame. After an update the old copy is cut off from the extension but its
// listeners live on, and the worker injects a new copy into open tabs; a tab loading during an
// install can get two. So each copy announces itself as it starts, and an older one stands down.
// ponytail: the page can send the same event and switch Vinimal off for itself; a page can block
// keys anyway.
const TAKEOVER = 'vinimal:content-script-started';
dispatchEvent(new Event(TAKEOVER));
const lifetime = new AbortController();
const { signal } = lifetime;

/** The site is the tab's, so a frame from another host follows the page it's on. */
const site = (() => {
  const { ancestorOrigins } = location;
  const top = ancestorOrigins.item(ancestorOrigins.length - 1);
  return URL.parse(top ?? '')?.hostname ?? location.hostname;
})();

let isEnabled = false;
const refreshIsEnabled = async () => {
  isEnabled = !(await isSiteDisabled(site));
};

let licensing: Awaited<ReturnType<typeof loadLicensing>> | undefined;
const refreshLicensing = async () => {
  licensing = await loadLicensing();
};

let showsOutlines = true;
const refreshShowsOutlines = async () => {
  showsOutlines = await loadShowsOutlines();
};

void refreshIsEnabled();
void refreshLicensing();
void refreshShowsOutlines();

const onStorageChanged = (changes: Record<string, unknown>, area: string) => {
  if (area === 'sync' && hostnamesIn(changes).includes(site)) void refreshIsEnabled();
  if (area === 'sync' && changesOutlines(changes)) void refreshShowsOutlines();
  if (area === 'local' && ('licence' in changes || 'installedAt' in changes)) {
    void refreshLicensing();
  }
};
chrome.storage.onChanged.addListener(onStorageChanged);

const currentStoppedReason = () =>
  licensing === undefined ? undefined : stoppedReason({ ...licensing, now: Date.now() });

const scroller = createScroller();
const hintFrame = createHintFrame({ showsOutlines: () => showsOutlines });
let session: HintSession | undefined;
const dispatch = createDispatcher();
/** Keys whose keydown Vinimal took, so their keyup is taken too. */
const taken = new Set<string>();
let hasNotified = false;

const take = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  taken.add(event.code);
};

/** The dialog shown in this frame (only ever the top one), and which. */
let dialog: { kind: 'notice' | 'help'; dialog: Dialog } | undefined;
const closeDialog = () => dialog?.dialog.close();

/** `?` shows the keys, and closes them again. In a frame, it asks the top frame. */
const toggleHelp = () => {
  if (window !== window.top) {
    void sendToWorker({ type: 'toggle-help' });
    return;
  }
  if (dialog?.kind === 'help') {
    closeDialog();
    return;
  }
  closeDialog();
  dialog = {
    kind: 'help',
    dialog: showHelp({
      onClose: () => {
        dialog = undefined;
      },
    }),
  };
};

/** Whether this copy still belongs to the installed extension; an update cuts the old one off. */
const isConnected = () => chrome.runtime?.id !== undefined;

addEventListener(
  'keydown',
  event => {
    if (!event.isTrusted) return;
    if (!isConnected()) {
      standDown();
      return;
    }
    if (session !== undefined) {
      if (session.keydown(event)) take(event);
      return;
    }
    // A dialog is modal: Esc closes it, `?` closes the keys, and Vinimal's other keys wait.
    if (dialog !== undefined) {
      if (event.key === 'Escape' || (event.key === '?' && dialog.kind === 'help')) {
        take(event);
        closeDialog();
      }
      return;
    }
    if (!isEnabled) return;
    const command = dispatch(readKey(event));
    if (command === undefined) return;
    // Esc leaves the text field so the keys work again; the page still hears it.
    if (command.type === 'leave-text-field') {
      leaveTextField();
      return;
    }
    const reason = currentStoppedReason();
    if (reason !== undefined) {
      if (!hasNotified) void sendToWorker({ type: 'keys-stopped' });
      hasNotified = true;
      return;
    }
    take(event);
    // A held Ctrl+E is still taken, so the page doesn't get it, but scrolls only once.
    if (event.repeat && !repeats(command)) return;
    switch (command.type) {
      case 'scroll':
        scroller.press({ ...command, isRepeat: event.repeat });
        return;
      case 'jump':
        scroller.jump(command.to);
        return;
      case 'page':
        scroller.page(command.direction);
        return;
      case 'switch-tab':
        void sendToWorker({ type: 'switch-tab', direction: command.direction });
        return;
      case 'await-g':
        return;
      case 'help':
        toggleHelp();
        return;
      case 'hints':
        session = startHintSession({
          onEnd: () => {
            session = undefined;
          },
        });
        return;
    }
  },
  { capture: true, signal },
);

addEventListener(
  'keyup',
  event => {
    session?.keyup(event);
    if (!taken.delete(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (['j', 'k', 'h', 'l'].includes(event.key.toLowerCase())) scroller.release();
  },
  { capture: true, signal },
);

// A held key whose keyup goes to another window would otherwise scroll on forever.
addEventListener(
  'blur',
  () => {
    scroller.release();
    session?.end();
  },
  { signal },
);

// A page kept for the back button would come back with its targets still outlined.
addEventListener(
  'pagehide',
  () => {
    session?.end();
    void hintFrame.handle({ type: 'hints-end' });
  },
  { signal },
);

const rememberTarget = (event: Event) => {
  const target = targetOf(event);
  if (target !== undefined) rememberActivated(target);
};
addEventListener(
  'mousedown',
  event => {
    rememberTarget(event);
    if (!isConnected()) return;
    if (session !== undefined || hintFrame.isShowing()) {
      session?.end();
      void sendToWorker({ type: 'hints-broadcast', message: { type: 'hints-end' } });
    }
  },
  { capture: true, signal },
);
addEventListener('focusin', rememberTarget, { capture: true, signal });

let hasShownNotice = false;

const onMessage = (
  message: FrameMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (reply: unknown) => void,
) => {
  if (sender.id !== chrome.runtime.id) return false;
  switch (message.type) {
    case 'show-notice': {
      const reason = currentStoppedReason();
      if (reason === undefined || hasShownNotice) return false;
      hasShownNotice = true;
      closeDialog();
      dialog = {
        kind: 'notice',
        dialog: showNotice({
          reason,
          onOpenLicence: () => void sendToWorker({ type: 'open-page', page: 'licence' }),
          onClose: () => {
            dialog = undefined;
          },
        }),
      };
      return false;
    }
    case 'toggle-help':
      toggleHelp();
      return false;
    case 'close-help':
      if (dialog?.kind === 'help') closeDialog();
      return false;
    case 'hints-labels':
      session?.relabel(message.labels);
      return false;
    case 'hints-end':
    case 'hints-activate':
      session?.stop();
      session = undefined;
      break;
  }
  // Finding targets waits for the browser's next rendering step, so the answer comes later.
  void hintFrame.handle(message).then(sendResponse);
  return true;
};
chrome.runtime.onMessage.addListener(onMessage);

/** Lets a newer copy take over: no more listeners, nothing left on the page. */
const standDown = () => {
  lifetime.abort();
  session = undefined;
  scroller.release();
  void hintFrame.handle({ type: 'hints-end' });
  closeDialog();
  // A copy cut off by an update can't reach chrome.* any more, and has nothing to remove there.
  if (isConnected()) {
    chrome.storage.onChanged.removeListener(onStorageChanged);
    chrome.runtime.onMessage.removeListener(onMessage);
  }
};

addEventListener(TAKEOVER, standDown, { signal });
