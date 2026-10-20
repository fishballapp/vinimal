import iconOnSvg from '../../../../../assets-src/icon.svg?raw';
import iconOffSvg from '../../../../../assets-src/icon-off.svg?raw';
import { siteName } from '../../sites';
import { mount, unmount } from './overlay';

/** How long the confirmation stays on screen before fading out. */
export const TOAST_DURATION = 2000;

/** How long the fade-out animation takes. */
const LEAVE_DURATION = 160;

const markFor = (isEnabled: boolean) => {
  const mark = new DOMParser().parseFromString(
    isEnabled ? iconOnSvg : iconOffSvg,
    'image/svg+xml',
  ).documentElement;
  mark.setAttribute('aria-hidden', 'true');
  mark.setAttribute('class', 'toast-mark');
  return document.importNode(mark, true);
};

let current:
  | {
      element: HTMLElement;
      timer: ReturnType<typeof setTimeout>;
      leaveTimer?: ReturnType<typeof setTimeout>;
    }
  | undefined;

export const dismissToast = () => {
  if (current === undefined) return;
  clearTimeout(current.timer);
  clearTimeout(current.leaveTimer);
  unmount(current.element);
  current = undefined;
};

/**
 * Shows a brief confirmation in the top frame when `ZZ` disables or enables Vinimal on a site.
 * Non-modal: takes no focus and lets clicks and keys pass through to the page.
 */
export const showToast = ({ hostname, isEnabled }: { hostname: string; isEnabled: boolean }) => {
  dismissToast();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.append(
    isEnabled ? 'Vinimal enabled on ' : 'Vinimal disabled on ',
    Object.assign(document.createElement('span'), {
      className: 'toast-host',
      textContent: siteName(hostname),
    }),
  );

  toast.append(markFor(isEnabled), text);
  mount(toast);

  const entry: NonNullable<typeof current> = {
    element: toast,
    timer: setTimeout(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (current === entry) dismissToast();
        return;
      }
      toast.classList.add('leaving');
      entry.leaveTimer = setTimeout(() => {
        if (current === entry) dismissToast();
      }, LEAVE_DURATION);
    }, TOAST_DURATION),
  };
  current = entry;
};
