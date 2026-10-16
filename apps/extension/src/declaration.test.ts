import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetOtherDocuments,
  forgetTab,
  isDeclaredOff,
  isTabDeclaredOff,
  setTabDeclaration,
} from './declaration';

/** A document whose only element is the `<meta>` tags given, matched by selector. */
const pageWith = (...tags: string[]) => ({
  querySelector: (selectors: string) => (tags.includes(selectors) ? {} : null),
});

const OFF_TAG = 'meta[name="vinimal"][content="off"]';

describe('isDeclaredOff', () => {
  it('is true for a page with the tag', () => {
    expect(isDeclaredOff(pageWith(OFF_TAG))).toBe(true);
  });

  it('is false for a page without it', () => {
    expect(isDeclaredOff(pageWith())).toBe(false);
  });
});

describe('the top frame’s answer per tab', () => {
  /** `chrome.storage.session` in memory, as the service worker uses it. */
  const stubSession = () => {
    const items = new Map<string, unknown>();
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: async (key: string) => (items.has(key) ? { [key]: items.get(key) } : {}),
          set: async (value: Record<string, unknown>) => {
            for (const [key, item] of Object.entries(value)) items.set(key, item);
          },
          remove: async (key: string) => {
            items.delete(key);
          },
        },
      },
    });
  };

  beforeEach(stubSession);
  afterEach(() => vi.unstubAllGlobals());

  it('is per tab, and off until a page says otherwise', async () => {
    await setTabDeclaration(1, { documentId: 'a', isOff: true });
    expect(await isTabDeclaredOff(1)).toBe(true);
    expect(await isTabDeclaredOff(2)).toBe(false);
  });

  it('is cleared when the tab’s page says it doesn’t declare it', async () => {
    await setTabDeclaration(1, { documentId: 'a', isOff: true });
    await setTabDeclaration(1, { documentId: 'a', isOff: false });
    expect(await isTabDeclaredOff(1)).toBe(false);
  });

  it('is cleared when another document commits in the tab', async () => {
    await setTabDeclaration(1, { documentId: 'a', isOff: true });
    await forgetOtherDocuments(1, 'b');
    expect(await isTabDeclaredOff(1)).toBe(false);
  });

  it('survives its own document’s commit, when the report got there first', async () => {
    await setTabDeclaration(1, { documentId: 'a', isOff: true });
    await forgetOtherDocuments(1, 'a');
    expect(await isTabDeclaredOff(1)).toBe(true);
  });

  it('goes with its tab', async () => {
    await setTabDeclaration(1, { documentId: 'a', isOff: true });
    await forgetTab(1);
    expect(await isTabDeclaredOff(1)).toBe(false);
  });
});
