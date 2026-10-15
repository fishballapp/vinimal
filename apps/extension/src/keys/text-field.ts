const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** Somewhere typing letters means typing, so Vinimal's keys stay out. */
export const isTextField = (element: Element) => {
  if (element instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(element.type);
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
};

/** The element an event happened in, inside open shadow roots; a closed one's host stands for it. */
export const targetOf = (event: Event) => {
  const [target] = event.composedPath();
  return target instanceof Element ? target : undefined;
};

/**
 * The element focused within `element`, down through its shadow roots, closed ones too: an event
 * from inside a closed root reaches Vinimal as its host, and only an extension can look inside.
 */
const focusedWithin = (element: Element): Element => {
  const root = element instanceof HTMLElement ? chrome.dom.openOrClosedShadowRoot(element) : null;
  const active = root?.activeElement;
  return active == null ? element : focusedWithin(active);
};

/** The focused element, inside open and closed shadow roots. */
export const deepActiveElement = () =>
  document.activeElement === null ? null : focusedWithin(document.activeElement);

/** Esc in a text field: blur it, so Vinimal's keys work again. */
export const leaveTextField = () => {
  const active = deepActiveElement();
  if (active instanceof HTMLElement) active.blur();
};

/** A keydown as `createDispatcher` reads it. */
export const readKey = (event: KeyboardEvent) => {
  const target = targetOf(event);
  // A key is typed where focus is, which a closed shadow root hides behind its host.
  const typedIn = target === undefined ? undefined : focusedWithin(target);
  const { key, ctrlKey, metaKey, altKey, shiftKey, isComposing } = event;
  return {
    key,
    ctrlKey,
    metaKey,
    altKey,
    shiftKey,
    isComposing,
    isTextField: typedIn !== undefined && isTextField(typedIn),
  };
};
