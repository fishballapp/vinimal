import { repeats } from '../keys/commands';
import { createDispatcher } from '../keys/dispatch';
import { leaveTextField, readKey } from '../keys/text-field';
import { sendToWorker } from '../messages';
import { createScroller } from '../scroll/scroller';

/**
 * Vinimal's keys on its own pages, where Chrome runs no content script: the scrolling keys and
 * `gt`/`gT`, through the same dispatcher and scroller as on a web page. No hints, since these
 * pages are a few links and buttons; `?` and Esc in the framed Keys page are the shell's.
 */
export const installPageKeys = () => {
  const dispatch = createDispatcher();
  const scroller = createScroller();
  const taken = new Set<string>();

  addEventListener(
    'keydown',
    event => {
      if (!event.isTrusted) return;
      const outcome = dispatch(readKey(event));
      if (outcome === undefined) return;
      if (outcome.type === 'leave-text-field') {
        leaveTextField();
        return;
      }
      if (outcome.type === 'hints' || outcome.type === 'help') return;
      event.preventDefault();
      taken.add(event.code);
      if (event.repeat && !repeats(outcome)) return;
      switch (outcome.type) {
        case 'scroll':
          scroller.press({ ...outcome, isRepeat: event.repeat });
          return;
        case 'jump':
          scroller.jump(outcome.to);
          return;
        case 'page':
          scroller.page(outcome.direction);
          return;
        case 'switch-tab':
          void sendToWorker({ type: 'switch-tab', direction: outcome.direction });
          return;
        case 'await-g':
          return;
      }
    },
    { capture: true },
  );

  addEventListener(
    'keyup',
    event => {
      if (!taken.delete(event.code)) return;
      event.preventDefault();
      scroller.release();
    },
    { capture: true },
  );

  // A held key whose keyup goes elsewhere would otherwise scroll on.
  addEventListener('blur', () => scroller.release());
};
