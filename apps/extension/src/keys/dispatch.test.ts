import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREFIX_TIMEOUT } from './commands';
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
    expect(dispatch(press('g'))).toEqual({ type: 'await-prefix', prefix: 'g' });
    expect(dispatch(press('g'))).toEqual({ type: 'jump', to: 'top' });
    dispatch(press('g'));
    vi.advanceTimersByTime(PREFIX_TIMEOUT + 1);
    expect(dispatch(press('g'))).toEqual({ type: 'await-prefix', prefix: 'g' });
  });

  it('finishes ZZ within the wait, keeps it through Shift, and drops it after the wait or another key', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('Z', { shiftKey: true }))).toEqual({
      type: 'await-prefix',
      prefix: 'Z',
    });
    expect(dispatch(press('Shift', { shiftKey: true }))).toBeUndefined();
    expect(dispatch(press('Z', { shiftKey: true }))).toEqual({ type: 'toggle-site' });

    dispatch(press('Z', { shiftKey: true }));
    vi.advanceTimersByTime(PREFIX_TIMEOUT + 1);
    expect(dispatch(press('Z', { shiftKey: true }))).toEqual({
      type: 'await-prefix',
      prefix: 'Z',
    });

    expect(dispatch(press('z'))).toBeUndefined();
    expect(dispatch(press('Z', { shiftKey: true }))).toEqual({
      type: 'await-prefix',
      prefix: 'Z',
    });
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

  it('says when the first g is waiting for the rest, and when the wait ends', () => {
    const pending: boolean[] = [];
    const dispatch = createDispatcher({ onPending: isPending => pending.push(isPending) });
    dispatch(press('g'));
    expect(pending).toEqual([true]);
    // Shift on the way to T keeps it waiting.
    dispatch(press('Shift', { shiftKey: true }));
    expect(pending).toEqual([true]);
    dispatch(press('T', { shiftKey: true }));
    expect(pending).toEqual([true, false]);
  });

  it('drops a waiting g for any other key, which then counts on its own', () => {
    const pending: boolean[] = [];
    const dispatch = createDispatcher({ onPending: isPending => pending.push(isPending) });
    dispatch(press('g'));
    expect(dispatch(press('j'))).toEqual({ type: 'scroll', axis: 'y', direction: 1 });
    expect(pending).toEqual([true, false]);
    // A key Vinimal doesn't have drops it too.
    dispatch(press('g'));
    expect(dispatch(press('x'))).toBeUndefined();
    expect(pending).toEqual([true, false, true, false]);
    // So the next g starts again.
    expect(dispatch(press('g'))).toEqual({ type: 'await-prefix', prefix: 'g' });
  });

  it('drops a waiting g after the wait', () => {
    const pending: boolean[] = [];
    const dispatch = createDispatcher({ onPending: isPending => pending.push(isPending) });
    dispatch(press('g'));
    vi.advanceTimersByTime(PREFIX_TIMEOUT + 1);
    expect(pending).toEqual([true, false]);
  });

  it('leaves keys in a text field to the page, and Esc leaves the field', () => {
    const dispatch = createDispatcher();
    expect(dispatch(press('j', { isTextField: true }))).toBeUndefined();
    expect(dispatch(press('Z', { shiftKey: true, isTextField: true }))).toBeUndefined();
    expect(dispatch(press('Escape', { isTextField: true }))).toEqual({ type: 'leave-text-field' });
  });
});
