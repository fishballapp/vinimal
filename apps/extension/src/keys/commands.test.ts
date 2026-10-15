import { describe, expect, it } from 'vitest';
import { commandFor, isForThePage, isModifierKey, repeats } from './commands';

describe('commandFor', () => {
  it('scrolls with j, k, h and l, and jumps to the bottom with G at once', () => {
    expect(commandFor({ key: 'j', ctrlKey: false, isAwaitingG: false })).toEqual({
      type: 'scroll',
      axis: 'y',
      direction: 1,
    });
    expect(commandFor({ key: 'h', ctrlKey: false, isAwaitingG: false })).toEqual({
      type: 'scroll',
      axis: 'x',
      direction: -1,
    });
    expect(commandFor({ key: 'G', ctrlKey: false, isAwaitingG: false })).toEqual({
      type: 'jump',
      to: 'bottom',
    });
  });

  it('waits for a second g before jumping to the top', () => {
    expect(commandFor({ key: 'g', ctrlKey: false, isAwaitingG: false })).toEqual({
      type: 'await-g',
    });
    expect(commandFor({ key: 'g', ctrlKey: false, isAwaitingG: true })).toEqual({
      type: 'jump',
      to: 'top',
    });
  });

  it('switches to the next tab with gt and the previous with gT', () => {
    expect(commandFor({ key: 't', ctrlKey: false, isAwaitingG: true })).toEqual({
      type: 'switch-tab',
      direction: 1,
    });
    expect(commandFor({ key: 'T', ctrlKey: false, isAwaitingG: true })).toEqual({
      type: 'switch-tab',
      direction: -1,
    });
  });

  it('leaves t and T to the page without a g first', () => {
    expect(commandFor({ key: 't', ctrlKey: false, isAwaitingG: false })).toBeUndefined();
    expect(commandFor({ key: 'T', ctrlKey: false, isAwaitingG: false })).toBeUndefined();
  });

  it('takes a key that doesn’t finish a g command on its own', () => {
    expect(commandFor({ key: 'j', ctrlKey: false, isAwaitingG: true })).toEqual({
      type: 'scroll',
      axis: 'y',
      direction: 1,
    });
  });

  it('shows the keys with ?', () => {
    expect(commandFor({ key: '?', ctrlKey: false, isAwaitingG: false })).toEqual({ type: 'help' });
  });

  it('pages down with Ctrl+E and up with Ctrl+Y', () => {
    expect(commandFor({ key: 'e', ctrlKey: true, isAwaitingG: false })).toEqual({
      type: 'page',
      direction: 1,
    });
    expect(commandFor({ key: 'y', ctrlKey: true, isAwaitingG: true })).toEqual({
      type: 'page',
      direction: -1,
    });
  });

  it('gives nothing for Ctrl with any other key, nor e and y without it', () => {
    expect(commandFor({ key: 'j', ctrlKey: true, isAwaitingG: false })).toBeUndefined();
    expect(commandFor({ key: 'e', ctrlKey: false, isAwaitingG: false })).toBeUndefined();
    expect(commandFor({ key: 'y', ctrlKey: false, isAwaitingG: false })).toBeUndefined();
  });

  it('starts hints with f', () => {
    expect(commandFor({ key: 'f', ctrlKey: false, isAwaitingG: false })).toEqual({ type: 'hints' });
  });

  it('leaves every other key to the page, shifted letters included', () => {
    for (const key of ['J', 'F', 'x', '/', 'Enter', ' ', 'ArrowDown']) {
      expect(commandFor({ key, ctrlKey: false, isAwaitingG: true })).toBeUndefined();
    }
  });
});

describe('isForThePage', () => {
  const plain = {
    key: 'j',
    isTextField: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
  };

  it('takes a plain key outside a text field', () => {
    expect(isForThePage(plain)).toBe(false);
  });

  it('leaves text fields, modifiers and composition to the page', () => {
    for (const key of ['isTextField', 'ctrlKey', 'metaKey', 'altKey', 'isComposing'] as const) {
      expect(isForThePage({ ...plain, [key]: true })).toBe(true);
    }
  });

  it('takes Ctrl+E and Ctrl+Y, the one exception to Ctrl', () => {
    expect(isForThePage({ ...plain, key: 'e', ctrlKey: true })).toBe(false);
    expect(isForThePage({ ...plain, key: 'y', ctrlKey: true })).toBe(false);
  });

  it('still leaves Ctrl+E to the page in a text field, mid-composition, or with another modifier', () => {
    const ctrlE = { ...plain, key: 'e', ctrlKey: true };
    for (const key of ['isTextField', 'isComposing', 'shiftKey', 'altKey', 'metaKey'] as const) {
      expect(isForThePage({ ...ctrlE, [key]: true })).toBe(true);
    }
  });
});

describe('isModifierKey', () => {
  it('knows a modifier pressed on its own, so the wait after g survives Shift on the way to T', () => {
    expect(isModifierKey('Shift')).toBe(true);
    expect(isModifierKey('Meta')).toBe(true);
    expect(isModifierKey('T')).toBe(false);
  });
});

describe('repeats', () => {
  it('scrolls again on a held j, but not on a held Ctrl+E', () => {
    expect(repeats({ type: 'scroll', axis: 'y', direction: 1 })).toBe(true);
    expect(repeats({ type: 'page', direction: 1 })).toBe(false);
  });
});
