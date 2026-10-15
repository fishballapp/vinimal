import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { G_TIMEOUT } from './commands';
import { createDispatcher, type KeyInput } from './dispatch';

const press = (key: string, overrides: Partial<KeyInput> = {}): KeyInput => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  isTextField: false,
  ...overrides,
});

describe('createDispatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves Esc to the input method while composing, and leaves the text field after', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('Escape', { isTextField: true, isComposing: true }))).toBeUndefined();
    expect(dispatch(press('Escape', { isTextField: true }))).toEqual({ type: 'leave-text-field' });
  });

  it('scrolls with j and pages with Ctrl+E', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('j'))).toEqual({ type: 'scroll', axis: 'y', direction: 1 });
    expect(dispatch(press('e', { ctrlKey: true }))).toEqual({ type: 'page', direction: 1 });
  });

  it('finishes gg within the wait, and not after it', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('g'))).toEqual({ type: 'await-g' });
    expect(dispatch(press('g'))).toEqual({ type: 'jump', to: 'top' });
    dispatch(press('g'));
    vi.advanceTimersByTime(G_TIMEOUT + 1);
    expect(dispatch(press('g'))).toEqual({ type: 'await-g' });
  });

  it('keeps the wait through Shift on the way to the T of gT', () => {
    const dispatch = createDispatcher();
    dispatch(press('g'));
    expect(dispatch(press('Shift', { shiftKey: true }))).toBeUndefined();
    expect(dispatch(press('T', { shiftKey: true }))).toEqual({
      type: 'switch-tab',
      direction: -1,
    });
  });

  it('leaves keys in a text field to the page, and Esc leaves the field', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('j', { isTextField: true }))).toBeUndefined();
    expect(dispatch(press('Escape', { isTextField: true }))).toEqual({ type: 'leave-text-field' });
  });
});
