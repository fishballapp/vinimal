import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answerSite } from './site-status';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 16);
const site = { origin: 'https://vinimal.fishball.app' };
const release = { allowsLocalhost: false, now };

/** `chrome.storage` holding these items, as the worker reads them. */
const stubStorage = ({ sync = {}, local = {} }: { sync?: object; local?: object }) => {
  const area = (items: Record<string, unknown>) => ({
    get: async (keys: string | string[]) =>
      Object.fromEntries([keys].flat().flatMap(key => (key in items ? [[key, items[key]]] : []))),
  });
  vi.stubGlobal('chrome', { storage: { sync: area({ ...sync }), local: area({ ...local }) } });
};

describe('answerSite', () => {
  beforeEach(() => stubStorage({ local: { installedAt: now - DAY } }));
  afterEach(() => vi.unstubAllGlobals());

  it('says Vinimal is on, in the trial', async () => {
    expect(await answerSite({ type: 'status' }, site, release)).toEqual({ isEnabled: true });
  });

  it('says it’s off where the toolbar icon switched the site off', async () => {
    stubStorage({
      sync: { 'disabled:vinimal.fishball.app': now - DAY },
      local: { installedAt: now - DAY },
    });
    expect(await answerSite({ type: 'status' }, site, release)).toEqual({ isEnabled: false });
  });

  it('says why the keys have stopped', async () => {
    stubStorage({ local: { installedAt: now - 30 * DAY } });
    expect(await answerSite({ type: 'status' }, site, release)).toEqual({
      isEnabled: true,
      stoppedReason: 'trial-ended',
    });
  });

  it('answers the dev server only in a build that isn’t a release', async () => {
    const devServer = { origin: 'http://localhost:4321' };
    expect(await answerSite({ type: 'status' }, devServer, release)).toBeUndefined();
    expect(await answerSite({ type: 'status' }, devServer, { allowsLocalhost: true, now })).toEqual(
      { isEnabled: true },
    );
  });

  it('answers nothing to another page, or to a message it doesn’t know', async () => {
    expect(
      await answerSite({ type: 'status' }, { origin: 'https://example.com' }, release),
    ).toBeUndefined();
    expect(await answerSite({ type: 'status' }, {}, release)).toBeUndefined();
    for (const message of [
      undefined,
      'status',
      { type: 'licence' },
      { type: 'activate-licence' },
    ]) {
      expect(await answerSite(message, site, release)).toBeUndefined();
    }
  });
});
