/** How far one press of j, k, h or l scrolls, in CSS px. */
export const STEP = 80;
/** How fast a held key scrolls, in px per second, once it has been held for {@link HOLD_DELAY}. */
export const HOLD_SPEED = 1100;
/** How long a key is down before it counts as held, in ms. */
export const HOLD_DELAY = 140;
/**
 * How much of a page Ctrl+E and Ctrl+Y scroll: seven eighths of what's visible, so the last eighth
 * stays in view and you keep your place, as Chrome's own Page Down does.
 */
export const pageDistance = (visibleHeight: number) => Math.round(visibleHeight * 0.875);
/** How quickly the scroll catches up with where it's heading: the time constant, in ms. */
export const CATCH_UP = 60;
/** The same for gg and G, which travel further. */
export const JUMP_CATCH_UP = 90;

/**
 * A glide: the scroll chases a target that a press moves by {@link STEP} and a held key keeps
 * moving at {@link HOLD_SPEED}. Chasing (the distance left shrinks by e^(−t/τ)) eases every start,
 * stop and change of direction, so taps chain smoothly and a hold flows without steps.
 */
export type Glide = {
  /** How far the glide has scrolled so far, in px from where it started. */
  position: number;
  /** Where it's heading, in px from where it started. */
  target: number;
  catchUp: number;
  /** The direction a held key is pushing the target, and since when (ms). */
  hold: { direction: 1 | -1; since: number } | undefined;
};

/** The glide after `dt` ms, at time `now`. */
export const advance = (glide: Glide, now: number, dt: number): Glide => {
  const pushed =
    glide.hold === undefined
      ? 0
      : (glide.hold.direction *
          HOLD_SPEED *
          Math.max(0, Math.min(dt, now - glide.hold.since - HOLD_DELAY))) /
        1000;
  const target = glide.target + pushed;
  return {
    ...glide,
    target,
    position: target - (target - glide.position) * Math.exp(-dt / glide.catchUp),
  };
};

/** A glide with no key held has arrived once it's within half a pixel. */
export const isSettled = ({ position, target, hold }: Glide) =>
  hold === undefined && Math.abs(target - position) < 0.5;
