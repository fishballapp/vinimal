import { isNewTabModifier, NEW_TAB_KEY } from '../keys/platform';
import { type HintMessage, sendToWorker } from '../messages';
import { isHintLetter, narrow } from './labels';

const broadcast = (message: HintMessage) => void sendToWorker({ type: 'hints-broadcast', message });

/**
 * The keyboard side of a hint session, in the frame where `f` was pressed: it holds every frame's
 * labels and tells all of them what was typed. Letters typed before the labels arrive are kept.
 */
export const startHintSession = ({ onEnd }: { onEnd: () => void }) => {
  let labels: string[] | undefined;
  let typed = '';
  let isNewTab = false;
  /** ⌘ (Ctrl) is down and nothing else has been pressed with it yet. */
  let isTappingNewTabKey = false;
  let isOver = false;
  const early: { letter: string; isNewTab: boolean }[] = [];

  const finish = (message: HintMessage) => {
    if (isOver) return;
    isOver = true;
    broadcast(message);
    onEnd();
  };
  const filter = () => broadcast({ type: 'hints-filter', typed, isNewTab });

  const type = (letter: string, isChoosingNewTab: boolean) => {
    if (labels === undefined) {
      early.push({ letter, isNewTab: isChoosingNewTab });
      return;
    }
    const next = typed + letter;
    const result = narrow(labels, next);
    if (result.type === 'no-match') return;
    if (result.type === 'chosen') {
      finish({ type: 'hints-activate', label: result.label, isNewTab: isChoosingNewTab });
      return;
    }
    typed = next;
    filter();
  };

  void (async () => {
    const plan = await sendToWorker({ type: 'hints-start' });
    if (isOver) return;
    labels = plan?.flatMap(frame => frame.labels) ?? [];
    if (labels.length === 0) {
      finish({ type: 'hints-end' });
      return;
    }
    for (const { letter, isNewTab: isChoosingNewTab } of early.splice(0)) {
      type(letter, isChoosingNewTab);
    }
  })();

  return {
    end: () => finish({ type: 'hints-end' }),
    /** Another frame ended the session or chose a hint, so this one stops without a word. */
    stop: () => {
      isOver = true;
    },
    /**
     * The labels on screen after a scroll. If none begins with what's typed, the targets it meant
     * have gone, so the typing starts again and every hint shows.
     */
    relabel: (next: string[]) => {
      if (labels === undefined) return;
      labels = next;
      if (typed !== '' && !next.some(label => label.startsWith(typed))) {
        typed = '';
        filter();
      }
    },
    /** Whether the session took the key; one it doesn't take goes to the page. */
    keydown: (event: KeyboardEvent): boolean => {
      if (event.key === NEW_TAB_KEY) {
        isTappingNewTabKey = true;
        return true;
      }
      isTappingNewTabKey = false;
      if (event.key === 'Escape') {
        finish({ type: 'hints-end' });
        return true;
      }
      if (event.key === 'Backspace') {
        typed = typed.slice(0, -1);
        filter();
        return true;
      }
      const letter = event.key.toLowerCase();
      if (isHintLetter(letter) && !event.altKey) {
        type(letter, isNewTab || isNewTabModifier(event));
        return true;
      }
      // Any other shortcut (⌘R, Ctrl+Tab) ends the session and reaches the browser and the page.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        finish({ type: 'hints-end' });
        return false;
      }
      return true;
    },
    /**
     * A tap of ⌘ (Ctrl) on its own switches new-tab mode on or off. Holding it while typing a
     * label would reach the browser for ⌘W, which a page can't keep.
     */
    keyup: (event: KeyboardEvent) => {
      if (event.key !== NEW_TAB_KEY || !isTappingNewTabKey) return;
      isTappingNewTabKey = false;
      isNewTab = !isNewTab;
      filter();
    },
  };
};

export type HintSession = ReturnType<typeof startHintSession>;
