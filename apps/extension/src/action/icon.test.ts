import { describe, expect, it } from 'vitest';
import { iconStateOf, TITLES } from './icon';
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
