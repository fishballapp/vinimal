import {
  advance,
  CATCH_UP,
  type Glide,
  isSettled,
  JUMP_CATCH_UP,
  pageDistance,
  STEP,
} from './glide';
import { type Axis, distanceTo, findScrollable } from './scrollable';

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

type Running = Glide & {
  element: Element;
  axis: Axis;
  /** Whole pixels already scrolled, so fractions of a frame add up instead of being dropped. */
  applied: number;
  lastFrame: number;
};

/**
 * Drives the glides with `requestAnimationFrame`, one at a time: a key on another axis or element
 * takes over from the last. Under `prefers-reduced-motion` every press, and every repeat of a held
 * key, jumps a step instead.
 */
export const createScroller = () => {
  let running: Running | undefined;
  let frame: number | undefined;

  const tick = (now: number) => {
    frame = undefined;
    if (running === undefined) return;
    // A frame's timestamp can be from just before the press that started the glide; a long gap
    // (a background tab) is taken as one frame rather than a leap.
    const next = advance(running, now, Math.min(Math.max(now - running.lastFrame, 0), 50));
    const whole = Math.round(next.position);
    const { element, axis } = running;
    const read = () => (axis === 'y' ? element.scrollTop : element.scrollLeft);
    const before = read();
    element.scrollBy({
      [axis === 'y' ? 'top' : 'left']: whole - running.applied,
      behavior: 'instant',
    });
    const isStuck = whole !== running.applied && read() === before;
    running = { ...running, ...next, applied: whole, lastFrame: now };
    if (isStuck || isSettled(running)) {
      running = undefined;
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  const glideBy = ({
    axis,
    distance,
    catchUp,
    hold,
  }: {
    axis: Axis;
    distance: number;
    catchUp: number;
    hold: Glide['hold'];
  }) => {
    const direction = distance < 0 ? -1 : 1;
    const element = findScrollable(axis, direction);
    if (element === undefined) return;
    if (prefersReducedMotion.matches) {
      element.scrollBy({ [axis === 'y' ? 'top' : 'left']: distance, behavior: 'instant' });
      return;
    }
    const now = performance.now();
    // A press during a glide on the same element and axis adds to it, so quick taps chain.
    running =
      running?.element === element && running.axis === axis
        ? { ...running, target: running.target + distance, catchUp, hold }
        : {
            element,
            axis,
            position: 0,
            target: distance,
            catchUp,
            hold,
            applied: 0,
            lastFrame: now,
          };
    if (frame === undefined) frame = requestAnimationFrame(tick);
  };

  return {
    /** A press of j, k, h or l; a repeat only counts under reduced motion, where it steps. */
    press: ({
      axis,
      direction,
      isRepeat,
    }: {
      axis: Axis;
      direction: 1 | -1;
      isRepeat: boolean;
    }) => {
      if (isRepeat && !prefersReducedMotion.matches) return;
      glideBy({
        axis,
        distance: direction * STEP,
        catchUp: CATCH_UP,
        hold: { direction, since: performance.now() },
      });
    },
    /** The key is up: the glide stops being pushed and eases to a stop. */
    release: () => {
      if (running !== undefined) running = { ...running, hold: undefined };
    },
    jump: (to: 'top' | 'bottom') => {
      // A jump measures from where the page is now, so it replaces any glide under way.
      running = undefined;
      const direction = to === 'top' ? -1 : 1;
      const element = findScrollable('y', direction);
      if (element === undefined) return;
      const distance = distanceTo(element, 'y', to === 'top' ? 'start' : 'end');
      if (distance !== 0) {
        glideBy({ axis: 'y', distance, catchUp: JUMP_CATCH_UP, hold: undefined });
      }
    },
    /** Ctrl+E and Ctrl+Y: a page of what `j` and `k` scroll, gliding like a jump. */
    page: (direction: 1 | -1) => {
      running = undefined;
      const element = findScrollable('y', direction);
      if (element === undefined) return;
      glideBy({
        axis: 'y',
        distance: direction * pageDistance(element.clientHeight),
        catchUp: JUMP_CATCH_UP,
        hold: undefined,
      });
    },
  };
};
