import css from './overlay.css?inline';
import { pageTone } from './page-tone';

// The host's own box, set inline with !important so no page stylesheet can move or hide it.
const HOST_STYLE = {
  all: 'initial',
  position: 'fixed',
  inset: '0',
  width: '100%',
  height: '100%',
  'max-width': 'none',
  'max-height': 'none',
  margin: '0',
  padding: '0',
  border: '0',
  background: 'transparent',
  overflow: 'visible',
  'pointer-events': 'none',
  'z-index': '2147483647',
};

let overlay: { host: HTMLElement; root: ShadowRoot } | undefined;

/**
 * The shadow root Vinimal draws into, created on first use. The host is a manual popover, so it
 * sits in the top layer, above the page's own dialogs and full-screen elements.
 */
const overlayRoot = () => {
  if (overlay?.host.isConnected === true) return overlay;
  const host = document.createElement('vinimal-overlay');
  for (const [property, value] of Object.entries(HOST_STYLE)) {
    host.style.setProperty(property, value, 'important');
  }
  host.popover = 'manual';
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = css;
  root.append(style);
  document.documentElement.append(host);
  overlay = { host, root };
  return overlay;
};

/** Adds an element to the overlay, raised above anything the page put in the top layer since. */
export const mount = (element: Element) => {
  const { host, root } = overlayRoot();
  host.dataset.tone = pageTone();
  root.append(element);
  if (host.matches(':popover-open')) host.hidePopover();
  host.showPopover();
};

/** Takes an element off, and the overlay with it once it's empty, leaving the page as it was. */
export const unmount = (element: Element) => {
  element.remove();
  if (overlay !== undefined && overlay.root.children.length === 1) {
    overlay.host.remove();
    overlay = undefined;
  }
};
