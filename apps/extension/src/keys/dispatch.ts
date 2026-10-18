import { type Command, commandFor, G_TIMEOUT, isForThePage, isModifierKey } from './commands';

/** What a keydown is, for deciding whether it's one of Vinimal's keys. */
export type KeyInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  isTextField: boolean;
};

/** A keydown's outcome: one of Vinimal's commands, or Esc leaving a text field. */
export type Outcome = Command | { type: 'leave-text-field' };

/**
 * Turns keydowns into Vinimal's commands, the same on a web page and on the extension's own
 * pages: text fields, modifiers and composition are the page's, and after a `g` it waits a while
 * for the key that finishes it. `undefined` for a key that belongs to the page.
 */
export const createDispatcher = ({
  onPending,
}: {
  /** The first `g` of a command was pressed (`true`), or the wait for the rest of it ended. */
  onPending?: (isPending: boolean) => void;
} = {}) => {
  let awaitingG: ReturnType<typeof setTimeout> | undefined;
  const wait = (timer: ReturnType<typeof setTimeout> | undefined) => {
    const wasPending = awaitingG !== undefined;
    awaitingG = timer;
    if (wasPending !== (timer !== undefined)) onPending?.(timer !== undefined);
  };
  return (input: KeyInput): Outcome | undefined => {
    // Mid-composition every key is the input method's, Esc included: it closes the candidates.
    if (input.isComposing) return undefined;
    if (input.key === 'Escape' && input.isTextField) return { type: 'leave-text-field' };
    if (isForThePage(input) || isModifierKey(input.key)) return undefined;
    const command = commandFor({
      key: input.key,
      ctrlKey: input.ctrlKey,
      isAwaitingG: awaitingG !== undefined,
    });
    clearTimeout(awaitingG);
    wait(undefined);
    if (command?.type === 'await-g') {
      wait(
        setTimeout(() => {
          wait(undefined);
        }, G_TIMEOUT),
      );
    }
    return command;
  };
};
