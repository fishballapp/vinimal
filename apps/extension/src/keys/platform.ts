const isMac = navigator.platform.startsWith('Mac');

/** ⌘ on a Mac, Ctrl elsewhere: tapped while choosing a hint, it opens the link in a new tab. */
export const isNewTabModifier = ({ metaKey, ctrlKey }: { metaKey: boolean; ctrlKey: boolean }) =>
  isMac ? metaKey : ctrlKey;

export const NEW_TAB_KEY = isMac ? 'Meta' : 'Control';

/** The modifiers a click with {@link isNewTabModifier} held carries. */
export const newTabClick = isMac ? { metaKey: true } : { ctrlKey: true };

/** How the new-tab modifier is written on this platform's keyboards. */
export const NEW_TAB_LEGEND = isMac ? '⌘' : 'Ctrl';
