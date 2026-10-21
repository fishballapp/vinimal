import { afterEach, describe, expect, it, vi } from 'vitest';
import { setTabDeclaration } from '../declaration';
import { isSiteDisabled } from '../sites';
import { iconStateOf, TITLES, toggleTabSite } from './icon';
import { iconPaths } from './icon-paths';

describe('TITLES', () => {
  it('says what a click does', () => {
    expect(TITLES.on('yozz.app')).toBe('Disable Vinimal on yozz.app');
    expect(TITLES.off('yozz.app')).toBe('Enable Vinimal on yozz.app');
    expect(TITLES.unavailable('')).toBe('Vinimal can’t run here');
  });

  it('names local files, which have no hostname', () => {
    expect(TITLES.on('')).toBe('Disable Vinimal on local files');
  });

  it('says the site turns Vinimal off, not what a click does', () => {
    expect(TITLES['declared-off']('gmail.com')).toBe('This site turns Vinimal off');
  });
});

describe('iconStateOf', () => {
  const site = { hostname: 'mail.google.com' };

  it('shows a site that declares Vinimal off as such, over the user’s choice', () => {
    expect(iconStateOf({ site, isDeclaredOff: true, isDisabled: false })).toBe('declared-off');
    expect(iconStateOf({ site, isDeclaredOff: true, isDisabled: true })).toBe('declared-off');
  });

  it('is unavailable where Vinimal can’t run, whatever the user chose', () => {
    expect(iconStateOf({ site: undefined, isDeclaredOff: false, isDisabled: true })).toBe(
      'unavailable',
    );
  });

  it('is the user’s choice otherwise', () => {
    expect(iconStateOf({ site, isDeclaredOff: false, isDisabled: false })).toBe('on');
    expect(iconStateOf({ site, isDeclaredOff: false, isDisabled: true })).toBe('off');
  });
});

describe('iconPaths', () => {
  it('draws a site that declares Vinimal off with the disabled key', () => {
    expect(iconPaths('declared-off')).toEqual(iconPaths('off'));
  });
});

describe('toggleTabSite', () => {
  const stubChrome = (tabs: Record<number, string | undefined>) => {
    const makeArea = () => {
      const items = new Map<string, unknown>();
      return {
        get: async (key: string | null) => {
          if (key === null) return Object.fromEntries(items);
          return items.has(key) ? { [key]: items.get(key) } : {};
        },
        set: async (value: Record<string, unknown>) => {
          for (const [key, item] of Object.entries(value)) items.set(key, item);
        },
        remove: async (key: string) => {
          items.delete(key);
        },
      };
    };
    vi.stubGlobal('chrome', {
      storage: { sync: makeArea(), session: makeArea() },
      tabs: {
        get: async (tabId: number) => {
          if (!(tabId in tabs)) throw new Error('No tab');
          return { id: tabId, url: tabs[tabId] };
        },
      },
      extension: { isAllowedFileSchemeAccess: async () => false },
    });
  };

  afterEach(() => vi.unstubAllGlobals());

  it('disables an enabled site, and enables it again on the next toggle', async () => {
    stubChrome({ 1: 'https://mail.google.com/mail/u/0/' });
    expect(await toggleTabSite(1)).toEqual({
      hostname: 'mail.google.com',
      isEnabled: false,
    });
    expect(await isSiteDisabled('mail.google.com')).toBe(true);

    expect(await toggleTabSite(1)).toEqual({
      hostname: 'mail.google.com',
      isEnabled: true,
    });
    expect(await isSiteDisabled('mail.google.com')).toBe(false);
  });

  it('serialises two toggles fired at once so they end up back where they started', async () => {
    stubChrome({ 1: 'https://mail.google.com/mail/u/0/' });
    expect(await Promise.all([toggleTabSite(1), toggleTabSite(1)])).toEqual([
      { hostname: 'mail.google.com', isEnabled: false },
      { hostname: 'mail.google.com', isEnabled: true },
    ]);
    expect(await isSiteDisabled('mail.google.com')).toBe(false);
  });

  it('does nothing on a page that declares Vinimal off, leaving the disabled list untouched', async () => {
    stubChrome({ 1: 'https://vinimal.fishball.app/' });
    await setTabDeclaration(1, { documentId: 'doc-1', isOff: true });
    expect(await toggleTabSite(1)).toBeUndefined();
    expect(await isSiteDisabled('vinimal.fishball.app')).toBe(false);
  });

  it('does nothing where Vinimal can’t run', async () => {
    stubChrome({ 1: 'chrome://extensions/' });
    expect(await toggleTabSite(1)).toBeUndefined();
  });
});
