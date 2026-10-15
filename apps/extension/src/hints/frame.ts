import { type HintMessage, sendToWorker } from '../messages';
import { createHintLayer, type HintLayer } from '../ui/overlay/hint-layer';
import { activate } from './activate';
import { findTargets, type Target } from './targets';

/**
 * How long after the last scroll or resize a frame recounts. A recount takes up to ~20 ms on a big
 * page, too long for every frame of a scroll, so caps just follow their targets until it settles.
 */
const SETTLE_MS = 100;

/**
 * This frame's part in a hint session, whichever frame runs it: find targets when asked, draw the
 * labels it's given, keep them on their targets as the page scrolls, and follow the one chosen if
 * it's here.
 */
export const createHintFrame = ({ showsOutlines }: { showsOutlines: () => boolean }) => {
  let found: Target[] = [];
  let shown:
    | {
        layer: HintLayer;
        /** Each label's target. */
        targets: Map<string, Target>;
        stopWatching: AbortController;
      }
    | undefined;
  let recounting: Promise<void> | undefined;
  let isRecountDue = false;

  const clear = () => {
    shown?.stopWatching.abort();
    shown?.layer.remove();
    shown = undefined;
    found = [];
  };

  /** Ends the session in every frame, as when it can't go on here. */
  const endEverywhere = () => {
    clear();
    void sendToWorker({ type: 'hints-broadcast', message: { type: 'hints-end' } });
  };

  /**
   * Finds what's in view now: targets still there keep their labels and move onto their part in
   * view, gone ones give their labels back, and new ones get labels from the worker.
   */
  const recount = async () => {
    if (shown === undefined) return;
    const { layer, targets } = shown;
    const now = await findTargets();
    if (shown?.layer !== layer) return;
    const byElement = new Map(now.map(target => [target.element, target]));
    const kept = new Set<Element>();
    const released = [...targets].flatMap(([label, { element }]) => {
      const target = byElement.get(element);
      if (target === undefined) return [label];
      kept.add(element);
      targets.set(label, target);
      layer.move({ label, ...target });
      return [];
    });
    const fresh = now.filter(({ element }) => !kept.has(element));
    // Told even when nothing here changed, as the frames inside this one may have.
    layer.drop(released);
    for (const label of released) targets.delete(label);
    const labels = await sendToWorker({ type: 'hints-update', released, wanted: fresh.length });
    // A recount that outlived its session (or a newer one started) has nothing to end or add.
    if (shown?.layer !== layer) return;
    if (labels === null) {
      endEverywhere();
      return;
    }
    const added = labels.flatMap((label, i) => {
      const target = fresh[i];
      return target === undefined ? [] : [{ label, ...target }];
    });
    for (const { label, ...target } of added) targets.set(label, target);
    layer.add(added);
  };

  /** Recounts, one at a time: a recount asked for during one runs after it. */
  const requestRecount = () => {
    if (recounting !== undefined) {
      isRecountDue = true;
      return;
    }
    recounting = recount().finally(() => {
      recounting = undefined;
      if (isRecountDue) {
        isRecountDue = false;
        requestRecount();
      }
    });
  };

  /**
   * While hints show, any scroll in the frame (the page's or a panel's, as scroll events are caught
   * on their way down) or a resize moves the caps with their targets each frame and recounts once
   * it settles.
   */
  const watch = (layer: HintLayer, signal: AbortSignal) => {
    let frame: number | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        layer.follow();
      });
      clearTimeout(settle);
      settle = setTimeout(requestRecount, SETTLE_MS);
    };
    addEventListener('scroll', onMove, { capture: true, passive: true, signal });
    addEventListener('resize', onMove, { passive: true, signal });
    signal.addEventListener('abort', () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearTimeout(settle);
    });
  };

  return {
    isShowing: () => shown !== undefined,
    /** Answers `hints-collect` with how many targets this frame found. */
    handle: async (message: HintMessage): Promise<number | null> => {
      switch (message.type) {
        case 'hints-collect':
          clear();
          found = await findTargets();
          return found.length;
        case 'hints-show': {
          const layer = createHintLayer({ showsOutlines: showsOutlines() });
          const hints = message.labels.flatMap((label, i) => {
            const target = found[i];
            return target === undefined ? [] : [{ label, ...target }];
          });
          layer.add(hints);
          shown = {
            layer,
            targets: new Map(hints.map(({ label, ...target }) => [label, target])),
            stopWatching: new AbortController(),
          };
          watch(layer, shown.stopWatching.signal);
          return null;
        }
        case 'hints-recount':
          requestRecount();
          return null;
        case 'hints-filter':
          shown?.layer.filter(message);
          return null;
        case 'hints-activate': {
          const element = shown?.targets.get(message.label)?.element;
          if (shown !== undefined && element !== undefined) {
            shown.stopWatching.abort();
            shown.layer.press(message.label);
            shown = undefined;
            found = [];
            activate(element, message);
            return null;
          }
          clear();
          return null;
        }
        case 'hints-end':
          clear();
          return null;
      }
    },
  };
};
