import { newTabClick } from '../keys/platform';
import { isTextField } from '../keys/text-field';
import { sendToWorker } from '../messages';
import { rememberActivated } from '../scroll/scrollable';

/** A click as a mouse makes one, at the element's centre: what scripts listening for any part of it expect. */
const click = (element: Element, { isNewTab }: { isNewTab: boolean }) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: left + width / 2,
    clientY: top + height / 2,
    button: 0,
    ...(isNewTab ? newTabClick : {}),
  };
  element.dispatchEvent(new PointerEvent('pointerover', init));
  element.dispatchEvent(new MouseEvent('mouseover', init));
  element.dispatchEvent(new PointerEvent('pointerdown', init));
  const isFocusAllowed = element.dispatchEvent(new MouseEvent('mousedown', init));
  if (isFocusAllowed && element instanceof HTMLElement) element.focus({ preventScroll: true });
  element.dispatchEvent(new PointerEvent('pointerup', init));
  element.dispatchEvent(new MouseEvent('mouseup', init));
  element.dispatchEvent(new MouseEvent('click', { ...init, detail: 1 }));
};

/**
 * Follows a hint: a text field is focused, a select opens, a link held with ⌘ (Ctrl) opens in a new
 * tab next to this one, and anything else is clicked.
 */
export const activate = (element: Element, { isNewTab }: { isNewTab: boolean }) => {
  rememberActivated(element);
  if (element instanceof HTMLSelectElement) {
    element.focus();
    // showPicker needs the keypress's user activation, which a hint in another frame doesn't have.
    Promise.try(() => element.showPicker()).catch(() => undefined);
    return;
  }
  if (isTextField(element) && element instanceof HTMLElement) {
    element.focus();
    return;
  }
  if (isNewTab && element instanceof HTMLAnchorElement && element.href !== '') {
    void sendToWorker({ type: 'open-tab', url: element.href });
    return;
  }
  click(element, { isNewTab });
};
