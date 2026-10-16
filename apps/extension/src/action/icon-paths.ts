/** What the toolbar icon shows for a tab. */
export type IconState = 'on' | 'off' | 'unavailable';

/** The toolbar sizes of one state's icon: 16 px, and 32 px for 2× screens. */
export const iconPaths = (state: IconState) => ({
  16: `icons/${state}-16.png`,
  32: `icons/${state}-32.png`,
});
