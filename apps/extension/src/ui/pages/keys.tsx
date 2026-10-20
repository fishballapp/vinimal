import '../styles/global.css';
import type { ReactNode } from 'react';
import { NEW_TAB_LEGEND } from '../../keys/platform';
import { loadShowsOutlines, setShowsOutlines } from '../../settings';
import { type Finger, Key } from '../components/Key';
import { PageTitle, renderPage } from '../components/Shell';
import { useStored } from '../hooks';

/** The fingers of a touch typist, by the column of the letter rows they type. */
const FINGER_BY_COLUMN: Finger[] = [
  'pinky',
  'ring',
  'middle',
  'index',
  'index',
  'index',
  'index',
  'middle',
  'ring',
  'pinky',
];

const USED = new Set(['e', 'f', 'g', 'h', 'j', 'k', 'l', 't', 'y', 'z', '/']);

/** The left of a keyboard: modifier keys with their widths in key units, then a row of letters. */
const ROWS: { lead: { legend: string; width: number; isUsed: boolean }; letters: string }[] = [
  { lead: { legend: 'Tab', width: 1.5, isUsed: false }, letters: 'qwertyuiop' },
  { lead: { legend: 'Caps', width: 1.75, isUsed: false }, letters: 'asdfghjkl;' },
  { lead: { legend: 'Shift', width: 2.25, isUsed: true }, letters: 'zxcvbnm,./' },
  { lead: { legend: 'Control', width: 1.5, isUsed: true }, letters: '' },
];

// Every key is sized from the panel's own width (container query units), up to 2.4 rem, so the
// keyboard fits any window, zoom and font size without scrolling; legends scale with the keys. The
// widest row, Shift and ten keys, is 12.25 units and 10 gaps.
const KEY = 'h-(--unit) min-w-0 shrink-0 px-0 text-[length:calc(var(--unit)*0.34)]';
const LEAD_KEY =
  'h-(--unit) min-w-0 shrink-0 justify-start px-[calc(var(--unit)*0.2)] text-[length:max(8px,calc(var(--unit)*0.27))]';

/** Vinimal's keys on the keyboard, in the colours of the fingers that type them. */
const Keyboard = () => (
  <div aria-hidden="true" className="@container rounded-xl bg-sunken p-5">
    <div className="flex flex-col gap-(--gap) [--gap:clamp(2px,0.6cqi,5px)] [--unit:min(2.4rem,calc((100cqi_-_10_*_var(--gap))_/_12.25))]">
      <div className="flex">
        <Key finger="pinky" className={`${KEY} w-(--unit)`}>
          esc
        </Key>
      </div>
      {ROWS.map(({ lead, letters }) => (
        <div key={lead.legend} className="flex gap-(--gap)">
          <Key
            isIdle={!lead.isUsed}
            finger="pinky"
            style={{ width: `calc(var(--unit) * ${lead.width} + var(--gap) * ${lead.width - 1})` }}
            className={LEAD_KEY}
          >
            {lead.legend.toLowerCase()}
          </Key>
          {[...letters].map((letter, column) => (
            <Key
              key={letter}
              isIdle={!USED.has(letter)}
              finger={FINGER_BY_COLUMN[column]}
              className={`${KEY} w-(--unit)`}
            >
              {letter}
            </Key>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Whether hints outline what they click, under the key that shows them. */
const OutlinesSetting = () => {
  const showsOutlines = useStored('sync', ['outlines'], loadShowsOutlines);
  return (
    <label className="mt-1 flex w-fit items-center gap-2 text-[13px] text-ink-muted">
      <input
        type="checkbox"
        className="size-3.5 accent-ink"
        checked={showsOutlines ?? true}
        disabled={showsOutlines === undefined}
        onChange={event => void setShowsOutlines(event.target.checked)}
      />
      Outline what each hint clicks
    </label>
  );
};

/** Between the two keys of a pair that share a row. */
const Or = () => <span className="px-1 text-ink-faint">/</span>;

/** A cap per keystroke, its legend what you type (case kept, `^` for Control); a sequence is its
 * keys side by side. */
const KEYS: { keys: ReactNode; does: ReactNode }[] = [
  {
    keys: (
      <>
        <Key finger="index">j</Key>
        <Or />
        <Key finger="middle">k</Key>
      </>
    ),
    does: 'Scroll down / up',
  },
  {
    keys: (
      <>
        <Key finger="index">h</Key>
        <Or />
        <Key finger="ring">l</Key>
      </>
    ),
    does: 'Scroll left / right',
  },
  {
    keys: (
      <>
        <Key finger="index">g</Key>
        <Key finger="index">g</Key>
      </>
    ),
    does: 'Top',
  },
  { keys: <Key finger="index">G</Key>, does: 'Bottom' },
  {
    keys: (
      <>
        <Key finger="middle">^e</Key>
        <Or />
        <Key finger="index">^y</Key>
      </>
    ),
    does: 'Page down / up (^ is Control)',
  },
  {
    keys: (
      <>
        <Key finger="index">g</Key>
        <Key finger="index">t</Key>
        <Or />
        <Key finger="index">g</Key>
        <Key finger="index">T</Key>
      </>
    ),
    does: 'Next / previous tab',
  },
  {
    keys: <Key finger="index">f</Key>,
    does: (
      <>
        Click a link (tap <Key isInline>{NEW_TAB_LEGEND}</Key> first: new tab)
        <OutlinesSetting />
      </>
    ),
  },
  {
    keys: (
      <>
        <Key finger="pinky">Z</Key>
        <Key finger="pinky">Z</Key>
      </>
    ),
    does: 'Disable or enable on this site',
  },
  { keys: <Key finger="pinky">esc</Key>, does: 'Close, or leave a text field' },
  { keys: <Key finger="pinky">?</Key>, does: 'These keys' },
];

const KeysPage = () => (
  <>
    <PageTitle title="Keys" lede="Everything Vinimal does, on every site you haven’t disabled." />
    <Keyboard />
    <table className="w-full border-collapse">
      <thead className="sr-only">
        <tr>
          <th>Keys</th>
          <th>What they do</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {KEYS.map(({ keys, does }, i) => (
          <tr key={i}>
            <td className="w-0 py-2.5 pr-8 align-middle">
              <span className="flex items-center gap-1 whitespace-nowrap">{keys}</span>
            </td>
            <td className="py-2.5 align-middle">{does}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <ul className="flex list-none flex-col gap-1 text-ink-muted">
      <li>Keys in a text field go to the page.</li>
      <li>Click the toolbar icon or press ZZ to disable Vinimal on a site.</li>
    </ul>
  </>
);

renderPage('keys', <KeysPage />);
