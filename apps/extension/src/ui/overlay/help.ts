import { openDialog } from './dialog';

/**
 * `?`: the extension's own Keys page, framed in a dialog, so the in-page help and the page can't
 * drift apart and React stays out of the content script. Embedded, the page shows the mark and
 * name in place of its tabs.
 */
export const showHelp = ({ onClose }: { onClose: () => void }) => {
  const frame = document.createElement('iframe');
  frame.src = chrome.runtime.getURL('keys.html?embedded');
  frame.title = 'Vinimal keys';
  const dialog = openDialog({
    className: 'help',
    label: 'Vinimal keys',
    content: [frame],
    onClose,
  });
  // Keys go straight to the framed page, so j and k scroll it without a click first.
  frame.addEventListener('load', () => dialog.focus(frame), { once: true });
  return dialog;
};
