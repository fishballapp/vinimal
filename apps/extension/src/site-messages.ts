import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import type { StoppedReason } from './licence/stopped';

/**
 * What Vinimal's site asks the extension and what it hears back (`site.ts` names who may ask,
 * `site-status.ts` answers). Shared with the site, which loads it only once it knows some extension
 * answers it, so it imports nothing that would bring more of Effect along.
 */

export const SiteRequestSchema = Schema.Struct({ type: Schema.Literal('status') });

const STOPPED_REASONS = [
  'trial-ended',
  'expired',
  'ended',
  'unreachable',
] as const satisfies readonly StoppedReason[];

export const SiteStatusSchema = Schema.Struct({
  /** Whether Vinimal is on for the site: off when its toolbar icon switched it off there. */
  isEnabled: Schema.Boolean,
  /** Why the keys have stopped (the trial or licence ended), when they have. */
  stoppedReason: Schema.optionalKey(Schema.Literals(STOPPED_REASONS)),
});

export type SiteStatus = typeof SiteStatusSchema.Type;

/** The site's reading of a reply: a status, or `undefined` for anything else. */
export const readSiteStatus = (reply: unknown) =>
  Option.getOrUndefined(Schema.decodeUnknownOption(SiteStatusSchema)(reply));
