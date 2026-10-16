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

/** The toolbar sizes of one state's icon: 16 px, and 32 px for 2× screens. */
export const iconPaths = (state: IconState) => ({
  16: `icons/${DRAWINGS[state]}-16.png`,
  32: `icons/${DRAWINGS[state]}-32.png`,
});
