/** The three drawings on disk: the enabled key, the disabled one and the one that can't run. */
export type IconDrawing = 'on' | 'off' | 'unavailable';

/** What the toolbar icon shows for a tab. A site that declares Vinimal off gets the disabled key. */
export type IconState = IconDrawing | 'declared-off';

const DRAWINGS: Record<IconState, IconDrawing> = {
  on: 'on',
  off: 'off',
  unavailable: 'unavailable',
  'declared-off': 'off',
};

/**
 * The toolbar sizes of one state's icon: 16 px, and 32 px for 2× screens. Once the keys have
 * stopped, the key carries a small amber "!" in its corner; the key that can't run has its
 * prohibition sign there already.
 */
export const iconPaths = (state: IconState, isStopped = false) => {
  const drawing = DRAWINGS[state];
  const name = isStopped && drawing !== 'unavailable' ? `${drawing}-stopped` : drawing;
  return { 16: `icons/${name}-16.png`, 32: `icons/${name}-32.png` };
};
