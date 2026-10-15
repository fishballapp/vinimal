/**
 * The letters hints are spelled with: Vimium's default set, so most pages get one- and two-letter
 * labels. The home row's resting keys come first, then the reaches by how easy they are: `g` and
 * `h` beside the index fingers, then `e`, `m` and `c`, `w`, and `p` last. Letters are typed bare:
 * a new tab is a tap of ⌘ first, since ⌘W reaches the browser whatever the page does.
 */
export const HINT_LETTERS = [
  'f',
  'j',
  'd',
  'k',
  's',
  'l',
  'a',
  'g',
  'h',
  'e',
  'm',
  'c',
  'w',
  'p',
] as const;

type HintLetter = (typeof HINT_LETTERS)[number];

export const isHintLetter = (key: string): key is HintLetter =>
  HINT_LETTERS.some(letter => letter === key);

const RANK = new Map<string, number>(HINT_LETTERS.map((letter, i) => [letter, i]));
const rank = (letter: string) => RANK.get(letter) ?? HINT_LETTERS.length;

/** In the alphabet's order, letter by letter, a label before the labels it begins. */
const byAlphabet = (a: string, b: string): number => {
  const [first = '', second = ''] = [a[0], b[0]];
  if (first === '' || second === '') return a.length - b.length;
  if (first !== second) return rank(first) - rank(second);
  return byAlphabet(a.slice(1), b.slice(1));
};

const byShortest = (a: string, b: string) => a.length - b.length || byAlphabet(a, b);

/**
 * The labels of one hint session, handed out as targets come into view and taken back as they
 * leave. Every label, in use or free, is a leaf of one tree over the letters, so none is a prefix
 * of another. Labels are as short as they can be: the shortest free ones go first, and when too
 * few are free the shortest is split into its fourteen children (after Vimium's labels, MIT). One
 * label is always kept free, so the pool can always grow without changing a label on screen; when
 * all the children of a label are free again, they merge back into it.
 */
export const createLabelPool = () => {
  const used = new Set<string>();
  let free = [''];

  const splitShortest = () => {
    const [shortest = ''] = free.toSorted(byShortest);
    free = [
      ...free.filter(label => label !== shortest),
      ...HINT_LETTERS.map(letter => shortest + letter),
    ];
  };

  const mergeInto = (parent: string) => {
    const children = HINT_LETTERS.map(letter => parent + letter);
    if (!children.every(child => free.includes(child))) return;
    free = [...free.filter(label => !children.includes(label)), parent];
    if (parent !== '') mergeInto(parent.slice(0, -1));
  };

  return {
    /** `count` labels, in the alphabet's order, so labels sharing a first letter sit together. */
    take: (count: number): string[] => {
      if (count === 0) return [];
      while (free.length <= count) splitShortest();
      const taken = free.toSorted(byShortest).slice(0, count);
      free = free.filter(label => !taken.includes(label));
      for (const label of taken) used.add(label);
      return taken.toSorted(byAlphabet);
    },
    release: (labels: readonly string[]) => {
      for (const label of labels) {
        if (!used.delete(label)) continue;
        free.push(label);
        mergeInto(label.slice(0, -1));
      }
    },
    /** Every label in use. */
    inUse: () => [...used],
  };
};

export type LabelPool = ReturnType<typeof createLabelPool>;

/** What typing `typed` does to a hint session. */
export const narrow = (labels: readonly string[], typed: string) => {
  const matching = labels.filter(label => label.startsWith(typed));
  if (matching.length === 0) return { type: 'no-match' } as const;
  if (matching.length === 1 && matching[0] === typed) {
    return { type: 'chosen', label: typed } as const;
  }
  return { type: 'narrowed' } as const;
};
