import { pageTone } from './page-tone';

const ATTRIBUTE = 'data-vinimal-hint';

/** The caps' own colour on each tone, as OKLCH channels (`--cap` in overlay.css). */
const CAP = { light: '0.22 0.012 260', dark: '0.97 0.006 95' } as const;

/**
 * The outline rule. In a layer, so its `!important` beats any unlayered page rule however specific
 * (an important declaration in a layer outranks one outside every layer).
 */
const rule = (tone: 'light' | 'dark', isNarrowed: boolean) =>
  `@layer vinimal { [${ATTRIBUTE}] {
    outline: 1px dashed oklch(${CAP[tone]} / ${isNarrowed ? 0.7 : 0.35}) !important;
    outline-offset: -1px !important;
  } }`;

const adopt = (root: Document | ShadowRoot, sheet: CSSStyleSheet) => {
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
};

const drop = (root: Document | ShadowRoot, sheet: CSSStyleSheet) => {
  root.adoptedStyleSheets = root.adoptedStyleSheets.filter(adopted => adopted !== sheet);
};

/**
 * Faint dashed outlines round elements, painted by the page itself: an attribute on each element
 * and one stylesheet adopted by its document or shadow root. So an outline is clipped where the
 * element is (by a scrolling panel, the viewport), hidden under whatever covers it (a sticky
 * header), follows its corners, goes round each line of a link that wraps, and moves with the
 * element as the page scrolls. Outlines take no space, so the page's layout doesn't move.
 */
export const createOutlines = (pageElements?: readonly (Element | null)[]) => {
  const tone = pageTone(pageElements);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(rule(tone, false));
  const roots = new Set<Document | ShadowRoot>();
  const outlined = new Set<Element>();

  return {
    /** Shows or hides an element's outline. */
    toggle: (element: Element, isShown: boolean) => {
      const root = element.getRootNode();
      if (!(root instanceof Document || root instanceof ShadowRoot)) return;
      if (!roots.has(root)) {
        roots.add(root);
        adopt(root, sheet);
      }
      outlined.add(element);
      element.toggleAttribute(ATTRIBUTE, isShown);
    },
    /** Takes an element's outline away for good. */
    forget: (element: Element) => {
      element.removeAttribute(ATTRIBUTE);
      outlined.delete(element);
    },
    /** Firms the outlines up once typing has narrowed them. */
    narrow: (isNarrowed: boolean) => sheet.replaceSync(rule(tone, isNarrowed)),
    /** Leaves the page as it was. */
    remove: () => {
      for (const element of outlined) element.removeAttribute(ATTRIBUTE);
      for (const root of roots) drop(root, sheet);
    },
  };
};

export type Outlines = ReturnType<typeof createOutlines>;
