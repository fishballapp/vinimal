import '../styles/global.css';
import { loadDisabledSites, setSiteDisabled } from '../../sites';
import { Button } from '../components/Button';
import { PageTitle, renderPage } from '../components/Shell';
import { useStored } from '../hooks';

const SitesPage = () => {
  // Re-read on any sync change: a site disabled on another computer appears here too.
  const sites = useStored('sync', null, loadDisabledSites);
  return (
    <>
      <PageTitle
        title="Disabled sites"
        lede="Vinimal leaves these sites alone, so their own shortcuts work."
      />
      {sites !== undefined && sites.length === 0 && (
        <p className="rounded-xl bg-sunken px-5 py-8 text-center text-ink-muted">
          No sites are disabled.
        </p>
      )}
      {sites !== undefined && sites.length > 0 && (
        <ul className="divide-y divide-rule rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--rule)]">
          {sites.map(({ hostname }) => (
            <li key={hostname} className="flex items-center gap-4 py-2.5 pr-2.5 pl-5">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                {hostname === '' ? 'Local files' : hostname}
              </span>
              <Button
                aria-label={`Enable Vinimal on ${hostname === '' ? 'local files' : hostname}`}
                onClick={() => void setSiteDisabled(hostname, false)}
              >
                Enable
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

renderPage('sites', <SitesPage />);
