/** A box in viewport coordinates. */
export type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Something a hint can click: the element, the first part of it on screen, and the element that
 * shows it there (itself, or for a link with no box of its own, its first child that has one).
 */
export type Target = {
  element: Element;
  box: Box;
  shownBy: Element;
  /** Where the box's top-left corner is in `shownBy`'s bounding box, so a hint can follow it. */
  corner: { x: number; y: number };
};

type Shown = Pick<Target, 'box' | 'shownBy' | 'corner'>;

// What counts as clickable, after Vimium's link hints (MIT): controls and links first, then the
// signs scripts leave on things they made clickable.
const CONTROLS =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, [contenteditable]:not([contenteditable="false"])';

const CLICKABLE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'treeitem',
  'combobox',
]);

/** Google's own click wiring (`jsaction="click:…"`, or a bare handler, which is a click). */
const hasJsactionClick = (element: Element) =>
  (element.getAttribute('jsaction') ?? '').split(';').some(rule => {
    const [event, handler] = rule.includes(':') ? rule.split(':') : ['click', rule];
    return event?.trim() === 'click' && handler !== undefined && handler.trim() !== '';
  });

/**
 * How surely an element is clickable: 2 for a control or link, 1 for an element only a script's
 * signs mark as one, 0 for neither. A disabled control isn't.
 */
const clickability = (element: Element) => {
  if (element.matches(CONTROLS)) return element.matches(':disabled') ? 0 : 2;
  const tabIndex = element.getAttribute('tabindex');
  const isScripted =
    CLICKABLE_ROLES.has(element.getAttribute('role') ?? '') ||
    element.hasAttribute('onclick') ||
    (tabIndex !== null && Number.parseInt(tabIndex, 10) >= 0) ||
    hasJsactionClick(element);
  return isScripted ? 1 : 0;
};

/** Every element under a root, open shadow roots included, each host followed by its tree. */
const elementsIn = function* (root: Document | ShadowRoot): Generator<Element> {
  for (const element of root.querySelectorAll('*')) {
    yield element;
    if (element.shadowRoot !== null) yield* elementsIn(element.shadowRoot);
  }
};

/** The part of a rect inside what's visible of its element, if it's big enough to hint. */
const clip = (rect: DOMRect, visible: DOMRectReadOnly): Box | undefined => {
  const box = {
    left: Math.max(rect.left, visible.left),
    top: Math.max(rect.top, visible.top),
    right: Math.min(rect.right, visible.right),
    bottom: Math.min(rect.bottom, visible.bottom),
  };
  return box.right - box.left >= 3 && box.bottom - box.top >= 3 ? box : undefined;
};

const hasArea = (element: Element) =>
  [...element.getClientRects()].some(({ width, height }) => width > 0 && height > 0);

/**
 * The elements that can show a candidate: itself, or for a link with no box of its own (around a
 * floated or absolutely placed image), its descendants that have one.
 */
const showingElements = (element: Element): Element[] =>
  hasArea(element) ? [element] : [...element.children].flatMap(showingElements);

/**
 * What's visible of each element: its bounding box clipped by the viewport and by every ancestor
 * that clips, a scrolling panel's edges included. The browser works them all out in one batch at
 * its next rendering step; elements entirely out of sight are left out.
 */
const visibleRects = (elements: Element[]) =>
  new Promise<Map<Element, DOMRectReadOnly>>(resolve => {
    if (elements.length === 0) {
      resolve(new Map());
      return;
    }
    const observer = new IntersectionObserver(entries => {
      observer.disconnect();
      resolve(
        new Map(
          entries
            .filter(({ isIntersecting }) => isIntersecting)
            .map(({ target, intersectionRect }) => [target, intersectionRect]),
        ),
      );
    });
    for (const element of elements) observer.observe(element);
  });

/** Whether a click at a point would land on the element. */
export const isHitAt = (element: Element, x: number, y: number) => {
  const root = element.getRootNode();
  if (!(root instanceof Document || root instanceof ShadowRoot)) return false;
  const hit = root.elementFromPoint(x, y);
  if (hit === null) return false;
  return (
    hit === element ||
    element.contains(hit) ||
    (hit instanceof HTMLLabelElement && hit.control === element)
  );
};

/** Whether a click at the box's centre (or near its top-left) would land on the element. */
const isUncovered = (element: Element, box: Box) =>
  isHitAt(element, (box.left + box.right) / 2, (box.top + box.bottom) / 2) ||
  isHitAt(element, box.left + 2, box.top + 2);

/**
 * The box without the top of it something covers (a sticky header), so its hint sits where the
 * element comes out: halving the left edge between the covered corner and the first uncovered
 * point, a few probes, and only for a box whose corner is covered.
 */
const withoutCoveredTop = (element: Element, box: Box): Box => {
  const x = box.left + 2;
  if (isHitAt(element, x, box.top + 2)) return box;
  let covered = box.top;
  let uncovered = (box.top + box.bottom) / 2;
  if (!isHitAt(element, x, uncovered)) return box;
  while (uncovered - covered > 2) {
    const middle = (covered + uncovered) / 2;
    if (isHitAt(element, x, middle)) {
      uncovered = middle;
    } else {
      covered = middle;
    }
  }
  return { ...box, top: Math.round(covered) };
};

const shownPart = (element: Element, visible: Map<Element, DOMRectReadOnly>): Shown | undefined => {
  if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
    return undefined;
  }
  if (!hasArea(element)) {
    return [...element.children]
      .values()
      .map(child => shownPart(child, visible))
      .find(child => child !== undefined);
  }
  const visibleRect = visible.get(element);
  if (visibleRect === undefined) return undefined;
  // Each line of a link that wraps is a rect of its own; its first one in sight is where it shows.
  const box = [...element.getClientRects()]
    .values()
    .map(rect => clip(rect, visibleRect))
    .find((clipped): clipped is Box => clipped !== undefined && isUncovered(element, clipped));
  if (box === undefined) return undefined;
  const shown = withoutCoveredTop(element, box);
  const bounds = element.getBoundingClientRect();
  return {
    box: shown,
    shownBy: element,
    corner: { x: shown.left - bounds.left, y: shown.top - bounds.top },
  };
};

const parentOf = (element: Element) => {
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : undefined;
};

const isSameBox = (a: Box, b: Box) =>
  Math.abs(a.left - b.left) <= 4 &&
  Math.abs(a.top - b.top) <= 4 &&
  Math.abs(a.right - b.right) <= 4 &&
  Math.abs(a.bottom - b.bottom) <= 4;

/**
 * What a hint can point at in this frame, in document order. Where a clickable wraps another of
 * the same size (a link inside a focusable card), one hint covers both: the surer one, or the outer
 * when they're equally sure.
 */
export const findTargets = async (): Promise<Target[]> => {
  const clickables = elementsIn(document)
    .map(element => ({ element, clickability: clickability(element) }))
    .filter(({ clickability }) => clickability > 0)
    .toArray();
  const visible = await visibleRects(clickables.flatMap(({ element }) => showingElements(element)));
  const candidates = new Map(
    clickables.flatMap(({ element, clickability }) => {
      const shown = shownPart(element, visible);
      return shown === undefined ? [] : [[element, { ...shown, clickability }] as const];
    }),
  );
  const nearestCandidateAbove = (element: Element) => {
    for (let parent = parentOf(element); parent !== undefined; parent = parentOf(parent)) {
      const candidate = candidates.get(parent);
      if (candidate !== undefined) return { element: parent, ...candidate };
    }
    return undefined;
  };
  const dropped = new Set(
    candidates.entries().flatMap(([element, { box, clickability }]) => {
      const outer = nearestCandidateAbove(element);
      if (outer === undefined || !isSameBox(outer.box, box)) return [];
      return [clickability > outer.clickability ? outer.element : element];
    }),
  );
  return [...candidates.entries()]
    .filter(([element]) => !dropped.has(element))
    .map(([element, { box, shownBy, corner }]) => ({ element, box, shownBy, corner }));
};
