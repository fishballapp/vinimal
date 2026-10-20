import {
  type Command,
  commandFor,
  isForThePage,
  isModifierKey,
  PREFIX_TIMEOUT,
  type Prefix,
} from './commands';

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
 * pages: text fields, modifiers and composition are the page's, and after a prefix (`g` or `Z`) it
 * waits a while for the key that finishes it. `undefined` for a key that belongs to the page.
 */
export const createDispatcher = ({
  onPending,
}: {
  /** The first key of a sequence was pressed (`true`), or the wait for the rest of it ended. */
  onPending?: (isPending: boolean) => void;
} = {}) => {
  let awaiting: { prefix: Prefix; timer: ReturnType<typeof setTimeout> } | undefined;
  const wait = (next: { prefix: Prefix; timer: ReturnType<typeof setTimeout> } | undefined) => {
    const wasPending = awaiting !== undefined;
    awaiting = next;
    if (wasPending !== (next !== undefined)) onPending?.(next !== undefined);
  };
  return (input: KeyInput): Outcome | undefined => {
    // Mid-composition every key is the input method's, Esc included: it closes the candidates.
    if (input.isComposing) return undefined;
    if (input.key === 'Escape' && input.isTextField) return { type: 'leave-text-field' };
    if (isForThePage(input) || isModifierKey(input.key)) return undefined;
    const command = commandFor({
      key: input.key,
      ctrlKey: input.ctrlKey,
      awaiting: awaiting?.prefix,
    });
    clearTimeout(awaiting?.timer);
    wait(undefined);
    if (command?.type === 'await-prefix') {
      wait({
        prefix: command.prefix,
        timer: setTimeout(() => {
          wait(undefined);
        }, PREFIX_TIMEOUT),
      });
    }
    return command;
  };
};
