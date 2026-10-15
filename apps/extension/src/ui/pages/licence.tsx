import '../styles/global.css';
import { entitlementOf, type Licence } from '@fishballapps/extension-licence/entitlement';
import type { Validation } from '@fishballapps/extension-licence/polar';
import { loadLicensing } from '@fishballapps/extension-licence/store';
import { type Currency, formatLocalPrice } from '@fishballapps/utils';
import { type ReactNode, useState } from 'react';
import { PRICES, polar } from '../../licence/polar';
import { STOPPED_COPY, stoppedReason } from '../../licence/stopped';
import { sendToWorker } from '../../messages';
import { Button, ButtonLink } from '../components/Button';
import { PageTitle, renderPage } from '../components/Shell';
import { useStored } from '../hooks';

const price = (amounts: Readonly<Record<Currency, number>>) =>
  formatLocalPrice(amounts, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language);

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const LicencePage = () => {
  const licensing = useStored('local', ['installedAt', 'licence'], () => loadLicensing());
  if (licensing === undefined) return null;
  const now = Date.now();
  const entitlement = entitlementOf({ ...licensing, now });
  return (
    <>
      <PageTitle
        title="Licence"
        lede={`Vinimal is free to try for 14 days, then needs a licence key. A key can cost nothing: you pay what you want, from ${price(PRICES.oneYear.minimum)}.`}
      />
      <Status
        entitlement={entitlement}
        licence={licensing.licence}
        reason={stoppedReason({ ...licensing, now })}
      />
      {entitlement.status !== 'licensed' && <Options />}
      <KeyForm />
      <p className="text-[13px] text-ink-muted">
        Vinimal checks your key with Polar, the shop that sells it, once a day. Nothing else leaves
        your browser.
      </p>
    </>
  );
};

const Status = ({
  entitlement,
  licence,
  reason,
}: {
  entitlement: ReturnType<typeof entitlementOf>;
  licence: Licence | undefined;
  reason: ReturnType<typeof stoppedReason>;
}) => {
  if (reason !== undefined) {
    const { title, body } = STOPPED_COPY[reason];
    return (
      <section role="status" className="rounded-xl bg-notice px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-notice-ink">{body}</p>
      </section>
    );
  }
  if (entitlement.status === 'trial') {
    return (
      <section className="flex flex-col gap-0.5 rounded-xl bg-sunken px-5 py-4">
        <h2 className="font-semibold">
          Free trial: {entitlement.daysLeft === 1 ? '1 day' : `${entitlement.daysLeft} days`} left
        </h2>
        <p className="text-ink-muted">Then Vinimal’s keys stop until you add a licence key.</p>
      </section>
    );
  }
  const expiresAt = licence?.expiresAt;
  return (
    <section className="flex items-start justify-between gap-6 rounded-xl bg-sunken px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-index" />
          Licensed
        </h2>
        <p className="text-ink-muted">
          {expiresAt === undefined
            ? 'Your key lasts as long as your support. Thank you.'
            : `Your key lasts until ${DATE.format(expiresAt)}. Then get another here, free if you like.`}
        </p>
      </div>
      {expiresAt === undefined && (
        <a
          href={polar.portalUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Manage support
        </a>
      )}
    </section>
  );
};

const Options = () => (
  <section className="flex flex-col gap-3">
    <div className="grid divide-y divide-rule overflow-hidden rounded-xl border border-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <Option
        name="One year"
        price={`${price(PRICES.oneYear.minimum)} or more`}
        suggestion={`${price(PRICES.oneYear.suggested)} suggested`}
        terms="A key for a year. It doesn’t renew: come back for another next year."
        action={
          <ButtonLink variant="primary" href={polar.checkoutUrls.oneYear}>
            Get a key
          </ButtonLink>
        }
      />
      <Option
        name="Supporter"
        price={`${price(PRICES.supporter.minimum)} or more a year`}
        suggestion={`${price(PRICES.supporter.suggested)} suggested`}
        terms="A key for as long as you support Vinimal. Renews yearly; cancel any time."
        action={<ButtonLink href={polar.checkoutUrls.supporter}>Become a supporter</ButtonLink>}
      />
    </div>
    <p className="text-[13px] text-ink-muted">
      The checkout’s confirmation page shows your key. Paste it below.
    </p>
  </section>
);

const Option = ({
  name,
  price,
  suggestion,
  terms,
  action,
}: {
  name: string;
  price: string;
  suggestion: string;
  terms: string;
  action: ReactNode;
}) => (
  <div className="flex flex-col gap-4 bg-card p-5">
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold">{name}</h2>
      <p>
        <span className="font-medium tabular-nums">{price}</span>
        <span className="text-ink-muted"> · {suggestion}</span>
      </p>
      <p className="text-ink-muted">{terms}</p>
    </div>
    <div className="mt-auto">{action}</div>
  </div>
);

const ACTIVATION_ERRORS: Record<Exclude<Validation['type'], 'granted'>, string> = {
  rejected: 'That key isn’t valid, or it has expired or ended.',
  'rate-limited': 'Too many tries. Wait a minute, then try again.',
  unreachable: 'Couldn’t reach the licence server. Check your connection and try again.',
};

const KeyForm = () => {
  const [key, setKey] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | Validation['type']>('idle');
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async event => {
        event.preventDefault();
        setState('checking');
        setState((await sendToWorker({ type: 'activate-licence', key })) ?? 'unreachable');
      }}
    >
      <label htmlFor="licence-key" className="font-medium">
        Licence key
      </label>
      <div className="flex gap-2">
        <input
          id="licence-key"
          value={key}
          onChange={event => {
            setKey(event.target.value);
            setState('idle');
          }}
          placeholder="VINIMAL-…"
          autoComplete="off"
          spellCheck={false}
          className="h-8 min-w-0 flex-1 rounded-md bg-card px-2.5 font-mono text-[13px] shadow-[inset_0_0_0_1px_var(--input)] placeholder:text-ink-faint"
        />
        <Button type="submit" disabled={key.trim() === '' || state === 'checking'}>
          {state === 'checking' ? 'Checking…' : 'Add key'}
        </Button>
      </div>
      {state === 'granted' && <p role="status">Thanks. Vinimal’s keys are on.</p>}
      {state !== 'idle' && state !== 'checking' && state !== 'granted' && (
        <p role="alert" className="text-destructive">
          {ACTIVATION_ERRORS[state]}
        </p>
      )}
    </form>
  );
};

renderPage('licence', <LicencePage />);
