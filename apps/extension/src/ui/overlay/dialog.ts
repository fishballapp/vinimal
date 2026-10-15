import markSvg from '../../../../../assets-src/icon.svg?raw';
import { mount, unmount } from './overlay';

/** Vinimal's mark and name, so a dialog never reads as the page's own. */
export const brand = () => {
  const row = document.createElement('div');
  row.className = 'brand';
  const mark = new DOMParser().parseFromString(markSvg, 'image/svg+xml').documentElement;
  mark.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.textContent = 'Vinimal';
  row.append(document.importNode(mark, true), name);
  return row;
};

/**
 * A modal over a dimmed page, in the overlay: a native `<dialog>` shown with `showModal()`, so it
 * sits in the top layer, the page behind it is inert and Tab stays inside. A click on the backdrop
 * closes it, and so does Esc, whether the content script routes it or the dialog hears it. Focus
 * goes back where it was when the dialog closes.
 */
export const openDialog = ({
  className,
  label,
  content,
  onClose,
}: {
  className: string;
  label: string;
  content: Element[];
  onClose: () => void;
}) => {
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.setAttribute('aria-label', label);
  // The panel fills the dialog, so a click whose target is the dialog itself is on the backdrop.
  const panel = document.createElement('div');
  panel.className = `dialog ${className}`;
  panel.append(...content);
  modal.append(panel);

  let isOpen = true;
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    modal.close();
    unmount(modal);
    onClose();
  };
  modal.addEventListener('click', event => {
    if (event.target === modal) close();
  });
  modal.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  mount(modal);
  modal.showModal();
  return { close, focus: (element: HTMLElement) => element.focus({ preventScroll: true }) };
};

export type Dialog = ReturnType<typeof openDialog>;
