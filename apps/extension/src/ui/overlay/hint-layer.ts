import { isHitAt } from '../../hints/targets';
import { createOutlines } from './outlines';
import { mount, unmount } from './overlay';

const SVG = 'http://www.w3.org/2000/svg';

/** A small arrow out of a box: "opens in a new tab". */
const newTabMark = () => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 8 8');
  svg.setAttribute('class', 'new-tab-mark');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', 'M3 1.2H6.8V5M6.6 1.4 1.2 6.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
};

/** A keycap with a hint's letters. */
const capFor = (label: string) => {
  const cap = document.createElement('div');
  cap.className = 'cap';
  const letters = [...label].map(letter => {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = letter;
    return span;
  });
  cap.append(...letters, newTabMark());
  return { cap, letters };
};

/** A hint as the layer draws it: on `shownBy`, at `corner` in its bounding box. */
export type DrawnHint = { label: string; shownBy: Element; corner: { x: number; y: number } };

type Drawn = DrawnHint & ReturnType<typeof capFor> & { isInView: boolean };

/**
 * The hints of one frame, drawn as keycaps on their (optionally outlined) targets. A cap's top-left
 * corner sits on its target's visible part's, as Vimium's hints do, and follows the target as the
 * page scrolls.
 */
export const createHintLayer = ({ showsOutlines }: { showsOutlines: boolean }) => {
  const layer = document.createElement('div');
  layer.className = 'hints';
  const outlines = showsOutlines ? createOutlines() : undefined;
  const drawn = new Map<string, Drawn>();
  let filter = { typed: '', isNewTab: false };

  const show = (hint: Drawn) => {
    const isShown = hint.isInView && hint.label.startsWith(filter.typed);
    hint.cap.hidden = !isShown;
    outlines?.toggle(hint.shownBy, hint.label.startsWith(filter.typed));
    for (const [i, letter] of hint.letters.entries()) {
      letter.classList.toggle('typed', i < filter.typed.length);
    }
  };

  /**
   * Puts a cap where its target is now. As the page scrolls, one whose corner has left the window
   * or gone under something (a sticky header) waits hidden for the recount to find what's in view;
   * the targets a recount gives are in view by then.
   */
  const place = (hint: Drawn, { isScrolling }: { isScrolling: boolean }) => {
    const bounds = hint.shownBy.getBoundingClientRect();
    const x = bounds.left + hint.corner.x;
    const y = bounds.top + hint.corner.y;
    hint.isInView =
      !isScrolling ||
      (x >= 0 &&
        y >= 0 &&
        x < innerWidth &&
        y < innerHeight &&
        isHitAt(hint.shownBy, x + 2, y + 2));
    hint.cap.style.left = `${x}px`;
    hint.cap.style.top = `${y}px`;
  };

  return {
    labels: () => [...drawn.keys()],
    add: (hints: DrawnHint[]) => {
      for (const hint of hints) {
        const added = { ...hint, ...capFor(hint.label), isInView: true };
        drawn.set(hint.label, added);
        place(added, { isScrolling: false });
        show(added);
        layer.append(added.cap);
      }
      if (!layer.isConnected && drawn.size > 0) mount(layer);
    },
    /** Moves a hint onto its target's part in view now, after a recount. */
    move: ({ label, shownBy, corner }: DrawnHint) => {
      const hint = drawn.get(label);
      if (hint === undefined) return;
      if (hint.shownBy !== shownBy) outlines?.forget(hint.shownBy);
      Object.assign(hint, { shownBy, corner });
      place(hint, { isScrolling: false });
      show(hint);
    },
    drop: (labels: readonly string[]) => {
      for (const label of labels) {
        const hint = drawn.get(label);
        if (hint === undefined) continue;
        hint.cap.remove();
        outlines?.forget(hint.shownBy);
        drawn.delete(label);
      }
    },
    /** Moves every cap with its target, as the page scrolls. */
    follow: () => {
      for (const hint of drawn.values()) {
        place(hint, { isScrolling: true });
        show(hint);
      }
    },
    /** Shows only the hints `typed` begins, with the typed letters stepped back. */
    filter: (next: { typed: string; isNewTab: boolean }) => {
      filter = next;
      layer.classList.toggle('new-tab', next.isNewTab);
      outlines?.narrow(next.typed !== '');
      for (const hint of drawn.values()) show(hint);
    },
    /** Presses the chosen cap while the others leave, then clears the layer. */
    press: (label: string) => {
      for (const [other, { shownBy }] of drawn) {
        if (other !== label) outlines?.toggle(shownBy, false);
      }
      drawn.get(label)?.cap.classList.add('pressed');
      layer.classList.add('leaving');
      setTimeout(() => {
        outlines?.remove();
        unmount(layer);
      }, 140);
    },
    remove: () => {
      outlines?.remove();
      unmount(layer);
    },
  };
};

export type HintLayer = ReturnType<typeof createHintLayer>;
