import {
  type Entitlement,
  entitlementOf,
  type Licence,
} from '@fishballapps/extension-licence/entitlement';

/** Why the keys have stopped. A One year key running out is `expired`, said apart from the rest. */
export type StoppedReason = Exclude<Entitlement['status'], 'trial' | 'licensed'> | 'expired';

/** Why the keys have stopped, or `undefined` while the trial or a licence lets them work. */
export const stoppedReason = ({
  installedAt,
  licence,
  now,
}: {
  installedAt: number;
  licence: Licence | undefined;
  now: number;
}): StoppedReason | undefined => {
  const { status } = entitlementOf({ installedAt, licence, now });
  if (status === 'trial' || status === 'licensed') return undefined;
  const expiresAt = licence?.expiresAt;
  return status === 'ended' && expiresAt !== undefined && expiresAt <= now ? 'expired' : status;
};

export const STOPPED_COPY: Record<StoppedReason, { title: string; body: string }> = {
  'trial-ended': {
    title: 'Vinimal’s free trial has ended',
    body: 'Its keys are off until you add a licence key. A key can be free.',
  },
  expired: {
    title: 'Your year of Vinimal is up',
    body: 'Its keys are off until you add a new licence key. It can be free again.',
  },
  ended: {
    title: 'Your Vinimal licence has ended',
    body: 'Its keys are off until you add a licence key. A key can be free.',
  },
  unreachable: {
    title: 'Vinimal can’t check your licence',
    body: 'It hasn’t reached the licence server for 14 days, so its keys are off until it does.',
  },
};
