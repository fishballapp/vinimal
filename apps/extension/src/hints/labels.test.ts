import { describe, expect, it } from 'vitest';
import { createLabelPool, HINT_LETTERS, narrow } from './labels';

const isPrefixFree = (labels: string[]) =>
  labels.every((a, i) => labels.every((b, j) => i === j || !b.startsWith(a)));

const labelsFor = (count: number) => createLabelPool().take(count);

describe('createLabelPool', () => {
  it('uses one letter while there are fewer hints than letters', () => {
    expect(labelsFor(3)).toEqual(['f', 'j', 'd']);
    expect(labelsFor(HINT_LETTERS.length - 1).every(label => label.length === 1)).toBe(true);
  });

  it('stays prefix-free and unique, with lengths at most one apart', () => {
    for (const count of [1, 9, 10, 14, 40, 64, 65, 300, 700]) {
      const labels = labelsFor(count);
      expect(labels).toHaveLength(count);
      expect(new Set(labels).size).toBe(count);
      expect(isPrefixFree(labels)).toBe(true);
      const lengths = labels.map(label => label.length);
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(1);
    }
  });

  it('keeps labels with the same first letter together', () => {
    const firsts = labelsFor(20).map(label => label[0]);
    const runs = firsts.filter((letter, i) => letter !== firsts[i - 1]);
    expect(new Set(runs).size).toBe(runs.length);
  });

  it('keeps a page of a hundred targets to two letters', () => {
    expect(labelsFor(100).every(label => label.length <= 2)).toBe(true);
  });

  it('gives nothing for nothing', () => {
    expect(labelsFor(0)).toEqual([]);
  });

  it('hands out more labels without changing or prefixing the ones in use', () => {
    const pool = createLabelPool();
    const first = pool.take(5);
    const more = [...pool.take(30), ...pool.take(200)];
    expect(pool.inUse()).toEqual(expect.arrayContaining([...first, ...more]));
    expect(isPrefixFree(pool.inUse())).toBe(true);
    expect(new Set(pool.inUse()).size).toBe(235);
  });

  it('reuses released labels, and merges them back into shorter ones', () => {
    const pool = createLabelPool();
    const labels = pool.take(40);
    pool.release(labels.filter(label => label.length === 2));
    expect(pool.take(1)).toHaveLength(1);
    expect(pool.take(1)[0]).toHaveLength(1);
    expect(isPrefixFree(pool.inUse())).toBe(true);
  });

  it('ignores labels it never handed out', () => {
    const pool = createLabelPool();
    pool.take(3);
    pool.release(['zz']);
    expect(pool.inUse()).toHaveLength(3);
  });
});

describe('narrow', () => {
  const labels = ['ff', 'fj', 'j', 'd'];

  it('chooses a whole label', () => {
    expect(narrow(labels, 'j')).toEqual({ type: 'chosen', label: 'j' });
    expect(narrow(labels, 'fj')).toEqual({ type: 'chosen', label: 'fj' });
  });

  it('narrows on a prefix and refuses a letter that matches nothing', () => {
    expect(narrow(labels, 'f')).toEqual({ type: 'narrowed' });
    expect(narrow(labels, 'fk')).toEqual({ type: 'no-match' });
  });
});
