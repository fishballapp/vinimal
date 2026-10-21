import { cn } from 'cn';
import { type ReactNode, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import markUrl from '../../../../../assets-src/icon.svg';
import { PAGES, type Page, sendToWorker } from '../../messages';
import { installPageKeys } from '../page-keys';

/**
 * Shown by `?` in a dialog on a page (`?embedded`): the mark and name without the tabs, and Esc or
 * `?` here closes the dialog, as they do on the page.
 */
const isEmbedded = new URLSearchParams(location.search).has('embedded');

const EmbeddedShell = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== '?') return;
      event.preventDefault();
      void sendToWorker({ type: 'close-help' });
    };
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <div className="flex flex-col gap-8 px-8 pt-6 pb-10">
      <header className="flex items-center gap-2 border-b border-rule pb-3">
        <img src={markUrl} width={22} height={22} alt="" />
        <span className="font-semibold tracking-tight">Vinimal</span>
        <span className="ml-auto text-[13px] text-ink-muted">Esc to close</span>
      </header>
      <main className="flex flex-col gap-8">{children}</main>
    </div>
  );
};

/** Each page's frame: the mark, the three pages as tabs, and the page itself. */
const Shell = ({ page, children }: { page: Page; children: ReactNode }) => (
  <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 pt-8 pb-16">
    <header className="flex items-center gap-6 border-b border-rule">
      <span className="flex items-center gap-2 pb-3">
        <img src={markUrl} width={22} height={22} alt="" />
        <span className="font-semibold tracking-tight">Vinimal</span>
      </span>
      <nav aria-label="Vinimal" className="ml-auto flex gap-5">
        {Object.entries(PAGES).map(([id, { title, path }]) => (
          <a
            key={id}
            href={`/${path}`}
            aria-current={id === page ? 'page' : undefined}
            className={cn(
              'relative pb-3 text-[13px] text-ink-muted hover:text-ink',
              'aria-[current=page]:font-medium aria-[current=page]:text-ink',
              // The current page is underlined with the home-row bump's colour.
              'aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-index',
            )}
          >
            {title}
          </a>
        ))}
      </nav>
    </header>
    <main className="flex flex-col gap-8">{children}</main>
  </div>
);

export const renderPage = (page: Page, content: ReactNode) => {
  installPageKeys();
  const root = document.getElementById('root');
  if (root === null) throw new Error(`No #root in ${PAGES[page].path}`);
  createRoot(root).render(
    <StrictMode>
      {isEmbedded ? <EmbeddedShell>{content}</EmbeddedShell> : <Shell page={page}>{content}</Shell>}
    </StrictMode>,
  );
};

export const PageTitle = ({ title, lede }: { title: string; lede: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">{title}</h1>
    <p className="max-w-[60ch] text-ink-muted">{lede}</p>
  </div>
);
