import { loadLicensing } from '@fishballapps/extension-licence/store';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { stoppedReason } from './licence/stopped';
import { siteHostnameOf } from './site';
import { SiteRequestSchema, type SiteStatus } from './site-messages';
import { isSiteDisabled } from './sites';

/**
 * The worker's answer to Vinimal's own site (`site.ts`, `site-messages.ts`): whether Vinimal is on
 * there, so the page can say whose keys it's trying. Nothing else is answered, and only to the site.
 */

/** The reply to a message from a page, or `undefined` for a page or message it doesn't answer. */
export const answerSite = async (
  message: unknown,
  { origin }: { origin?: string },
  { allowsLocalhost, now }: { allowsLocalhost: boolean; now: number },
): Promise<SiteStatus | undefined> => {
  const hostname = siteHostnameOf(origin, { allowsLocalhost });
  if (hostname === undefined) return undefined;
  if (Option.isNone(Schema.decodeUnknownOption(SiteRequestSchema)(message))) return undefined;
  const [isDisabled, licensing] = await Promise.all([isSiteDisabled(hostname), loadLicensing(now)]);
  const reason = stoppedReason({ ...licensing, now });
  return {
    isEnabled: !isDisabled,
    ...(reason === undefined ? {} : { stoppedReason: reason }),
  };
};
