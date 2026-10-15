import { describe, expect, it } from 'vitest';
import {
  advance,
  CATCH_UP,
  type Glide,
  HOLD_DELAY,
  HOLD_SPEED,
  isSettled,
  pageDistance,
  STEP,
} from './glide';

const FRAME = 1000 / 60;

/** Runs a glide frame by frame from `start` for `duration` ms. */
const run = (glide: Glide, start: number, duration: number) =>
  Array.from({ length: Math.round(duration / FRAME) }).reduce<Glide>(
    (current, _, i) => advance(current, start + (i + 1) * FRAME, FRAME),
    glide,
  );

const tap = (): Glide => ({ position: 0, target: STEP, catchUp: CATCH_UP, hold: undefined });

describe('a tap', () => {
  it('eases out to one step and settles there', () => {
    const early = run(tap(), 0, 50);
    expect(early.position).toBeGreaterThan(STEP / 2);
    expect(early.position).toBeLessThan(STEP);
    const late = run(tap(), 0, 500);
    expect(isSettled(late)).toBe(true);
    expect(late.position).toBeCloseTo(STEP, 0);
  });
});

describe('a held key', () => {
  const held = (): Glide => ({ ...tap(), hold: { direction: 1, since: 0 } });

  it('only moves the target once the key counts as held', () => {
    expect(run(held(), 0, HOLD_DELAY - FRAME).target).toBe(STEP);
  });

  it('then scrolls at the hold speed, never settling while held', () => {
    const second = run(held(), 0, 1000 + HOLD_DELAY);
    expect(second.target).toBeCloseTo(STEP + HOLD_SPEED, -2);
    expect(isSettled(second)).toBe(false);
    const velocity = (run(held(), 0, 1100).position - run(held(), 0, 1000).position) / (100 / 1000);
    expect(velocity).toBeCloseTo(HOLD_SPEED, -2);
  });

  it('glides to a stop after it’s let go', () => {
    const released = { ...run(held(), 0, 600), hold: undefined };
    const stopped = run(released, 600, 500);
    expect(isSettled(stopped)).toBe(true);
    expect(stopped.position).toBeCloseTo(released.target, 0);
  });
});

describe('a page', () => {
  it('is seven eighths of what’s visible, so the last eighth stays in view', () => {
    expect(pageDistance(800)).toBe(700);
    expect(pageDistance(641)).toBe(561);
  });
});
