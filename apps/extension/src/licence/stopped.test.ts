import type { Licence } from '@fishballapps/extension-licence/entitlement';
import { describe, expect, it } from 'vitest';
import { stoppedReason } from './stopped';

const DAY = 24 * 60 * 60 * 1000;
const installedAt = Date.UTC(2026, 9, 1);
const now = installedAt + 400 * DAY;
const licence = (overrides: Partial<Licence>): Licence => ({
  key: 'VINIMAL-1',
  status: 'granted',
  grantedAt: now - DAY,
  nextCheckAt: now + DAY,
  ...overrides,
});

describe('stoppedReason', () => {
  it('lets the keys work in the trial and with a live key', () => {
    expect(stoppedReason({ installedAt, licence: undefined, now: installedAt })).toBeUndefined();
    expect(stoppedReason({ installedAt, licence: licence({}), now })).toBeUndefined();
  });

  it('tells a One year key running out from a licence Polar ended', () => {
    expect(stoppedReason({ installedAt, licence: licence({ expiresAt: now }), now })).toBe(
      'expired',
    );
    expect(stoppedReason({ installedAt, licence: licence({ status: 'ended' }), now })).toBe(
      'ended',
    );
    expect(stoppedReason({ installedAt, licence: undefined, now })).toBe('trial-ended');
  });
});
