// Which element a key scrolls. The rules are Vimium's (content_scripts/scroller.js,
// https://github.com/philc/vimium, MIT, © Phil Crosby and Ilya Sukhar): start from what the user
// last clicked or focused, walk up to the first ancestor that really scrolls, and test that by
// scrolling it, since `scrollHeight` overstates what an `overflow: hidden` box can do.

export type Axis = 'x' | 'y';

const SCROLLING_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

let activated: Element | undefined;

/** Where the user last clicked, focused or followed a hint: what the keys scroll first. */
export const rememberActivated = (element: Element) => {
  activated = element;
};

const page = () => document.scrollingElement ?? document.documentElement;

const overflowOf = (element: Element, axis: Axis) => {
  const style = getComputedStyle(element);
  return axis === 'y' ? style.overflowY : style.overflowX;
};

/** Scrolls one pixel and back: the only test `overflow` and `scrollHeight` can't fool. */
const moves = (element: Element, axis: Axis, direction: 1 | -1) => {
  const side = axis === 'y' ? 'top' : 'left';
  const read = () => (axis === 'y' ? element.scrollTop : element.scrollLeft);
  const before = read();
  element.scrollBy({ [side]: direction, behavior: 'instant' });
  const hasMoved = read() !== before;
  if (hasMoved) element.scrollTo({ [side]: before, behavior: 'instant' });
  return hasMoved;
};

const canScroll = (element: Element, axis: Axis, direction: 1 | -1) => {
  if (element === page()) {
    // A page locked behind a modal (`overflow: hidden` on html or body) still moves when told to.
    const isLocked = [document.documentElement, document.body].some(
      locker => locker !== null && overflowOf(locker, axis) === 'hidden',
    );
    return !isLocked && moves(element, axis, direction);
  }
  return (
    SCROLLING_OVERFLOW.has(overflowOf(element, axis)) &&
    element.checkVisibility() &&
    moves(element, axis, direction)
  );
};

const canScrollAxis = (element: Element, axis: Axis) =>
  canScroll(element, axis, 1) || canScroll(element, axis, -1);

/** The element's parent, stepping out of a shadow root to its host. */
const parentOf = (element: Element) => {
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : undefined;
};

const ancestorsOf = function* (element: Element | undefined) {
  for (let current = element; current !== undefined; current = parentOf(current)) yield current;
};

const visibleArea = (element: Element) => {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  const width = Math.min(right, innerWidth) - Math.max(left, 0);
  const height = Math.min(bottom, innerHeight) - Math.max(top, 0);
  return width > 0 && height > 0 ? width * height : 0;
};

/**
 * The element `direction` along `axis` scrolls: the nearest scrolling ancestor of what the user
 * last activated, then the page if it scrolls on that axis at all (at its end it stays the page,
 * rather than some sidebar moving instead), then the largest visible box that scrolls, which is how
 * apps like Gmail that never scroll the page get scrolled.
 */
export const findScrollable = (axis: Axis, direction: 1 | -1): Element | undefined => {
  const start = activated?.isConnected === true ? activated : undefined;
  const fromActivated = ancestorsOf(start).find(element => canScroll(element, axis, direction));
  if (fromActivated !== undefined) return fromActivated;
  if (canScrollAxis(page(), axis)) return page();
  return document
    .querySelectorAll('*')
    .values()
    .filter(element =>
      axis === 'y'
        ? element.scrollHeight > element.clientHeight
        : element.scrollWidth > element.clientWidth,
    )
    .map(element => ({ element, area: visibleArea(element) }))
    .filter(({ element, area }) => area > 0 && canScrollAxis(element, axis))
    .reduce<{ element: Element; area: number } | undefined>(
      (largest, candidate) =>
        largest === undefined || candidate.area > largest.area ? candidate : largest,
      undefined,
    )?.element;
};

/** How far `element` is from the start or the end of `axis`. */
export const distanceTo = (element: Element, axis: Axis, end: 'start' | 'end') => {
  const offset = axis === 'y' ? element.scrollTop : element.scrollLeft;
  if (end === 'start') return -offset;
  const max =
    axis === 'y'
      ? element.scrollHeight - element.clientHeight
      : element.scrollWidth - element.clientWidth;
  return max - offset;
};
