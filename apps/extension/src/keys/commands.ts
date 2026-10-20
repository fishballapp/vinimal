/** The prefix key a two-key sequence starts with. */
export type Prefix = 'g' | 'Z';

/** What one of Vinimal's keys does. */
export type Command =
  | { type: 'scroll'; axis: 'x' | 'y'; direction: 1 | -1 }
  | { type: 'jump'; to: 'top' | 'bottom' }
  /** A page down or up, as Ctrl+E and Ctrl+Y scroll in Vim. */
  | { type: 'page'; direction: 1 | -1 }
  | { type: 'hints' }
  /** The keys, shown in a dialog on the page. */
  | { type: 'help' }
  /** The next or previous tab in the window, wrapping at the ends. */
  | { type: 'switch-tab'; direction: 1 | -1 }
  /** Disable or enable Vinimal on the current site, as the toolbar icon does. */
  | { type: 'toggle-site' }
  /** The first key of `gg`, `gt`, `gT` or `ZZ`. */
  | { type: 'await-prefix'; prefix: Prefix };

const KEYS: Record<string, Command> = {
  j: { type: 'scroll', axis: 'y', direction: 1 },
  k: { type: 'scroll', axis: 'y', direction: -1 },
  h: { type: 'scroll', axis: 'x', direction: -1 },
  l: { type: 'scroll', axis: 'x', direction: 1 },
  G: { type: 'jump', to: 'bottom' },
  f: { type: 'hints' },
  g: { type: 'await-prefix', prefix: 'g' },
  Z: { type: 'await-prefix', prefix: 'Z' },
  '?': { type: 'help' },
};

/** The keys that take Ctrl, on every platform (Control on a Mac, not ⌘), as in Vim. */
const WITH_CTRL: Record<string, Command> = {
  e: { type: 'page', direction: 1 },
  y: { type: 'page', direction: -1 },
};

/** The keys that finish a command begun with a prefix (`g` or `Z`). */
const AFTER_PREFIX: Record<Prefix, Record<string, Command>> = {
  g: {
    g: { type: 'jump', to: 'top' },
    t: { type: 'switch-tab', direction: 1 },
    T: { type: 'switch-tab', direction: -1 },
  },
  Z: {
    Z: { type: 'toggle-site' },
  },
};

/** How long the second key of a sequence (`gg`, `gt`, `gT`, `ZZ`) may take. */
export const PREFIX_TIMEOUT = 1000;

/**
 * The command a key gives, by `KeyboardEvent.key` so it follows the keyboard layout. `undefined`
 * for any other key, which belongs to the page. After a prefix, a key that doesn't finish a
 * command counts on its own.
 */
export const commandFor = ({
  key,
  ctrlKey,
  awaiting,
}: {
  key: string;
  ctrlKey: boolean;
  awaiting?: Prefix | undefined;
}): Command | undefined => {
  if (ctrlKey) return WITH_CTRL[key];
  return (awaiting === undefined ? undefined : AFTER_PREFIX[awaiting][key]) ?? KEYS[key];
};

/** Whether a held key's repeats do the command again: a page down or site toggle is once per press. */
export const repeats = (command: Command) =>
  command.type !== 'page' && command.type !== 'toggle-site';

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph']);

/** A modifier pressed on its own, as Shift is on the way to the `T` of `gT`: it changes nothing. */
export const isModifierKey = (key: string) => MODIFIERS.has(key);

/**
 * A key typed into a text field, held with a modifier, or mid-composition is the page's. The one
 * exception is Ctrl alone with one of Vinimal's Ctrl keys (`WITH_CTRL`).
 */
export const isForThePage = ({
  key,
  isTextField,
  ctrlKey,
  metaKey,
  altKey,
  shiftKey,
  isComposing,
}: {
  key: string;
  isTextField: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
}) => {
  if (isTextField || isComposing || metaKey || altKey) return true;
  if (!ctrlKey) return false;
  return shiftKey || WITH_CTRL[key] === undefined;
};
