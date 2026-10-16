import { describe, expect, it } from 'vitest';
import { TITLES } from './icon';

describe('TITLES', () => {
  it('says what a click does', () => {
    expect(TITLES.on('yozz.app')).toBe('Disable Vinimal on yozz.app');
    expect(TITLES.off('yozz.app')).toBe('Enable Vinimal on yozz.app');
    expect(TITLES.unavailable('')).toBe('Vinimal can’t run here');
  });

  it('names local files, which have no hostname', () => {
    expect(TITLES.on('')).toBe('Disable Vinimal on local files');
  });
});
