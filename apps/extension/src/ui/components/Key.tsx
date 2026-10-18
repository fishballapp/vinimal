import { cn } from '@fishballapps/cn';
import type { CSSProperties, ReactNode } from 'react';

export type Finger = 'index' | 'middle' | 'ring' | 'pinky';

const FINGER_BAR: Record<Finger, string> = {
  index: 'bg-index',
  middle: 'bg-middle',
  ring: 'bg-ring',
  pinky: 'bg-pinky',
};

/**
 * A keycap with its legend, and a bar in the colour of the finger that types it, as on a
 * touch-typing chart. One cap per keystroke, its legend what you type, case kept (`j`, `G`, `T`,
 * `^e`); a sequence such as `gg` is two caps. An idle key
 * (one Vinimal doesn't use) is drawn faint, without a bar.
 */
export const Key = ({
  children,
  finger,
  isIdle = false,
  isInline = false,
  className,
  style,
}: {
  children: ReactNode;
  finger?: Finger;
  isIdle?: boolean;
  /** Set in a line of text: shorter, so the line keeps its height. */
  isInline?: boolean;
  className?: string;
  style?: CSSProperties;
}) => (
  <kbd
    style={style}
    className={cn(
      'relative inline-flex items-center justify-center rounded-[5px] font-mono text-xs font-bold',
      isInline ? 'h-5 min-w-5 px-1 align-[-0.15em] text-[11px]' : 'h-7 min-w-7 px-1.5 pb-1',
      isIdle
        ? 'bg-key-idle text-ink-faint'
        : 'bg-key text-ink shadow-[inset_0_0_0_1px_var(--rule),0_1.5px_0_0_var(--key-side)]',
      className,
    )}
  >
    {children}
    {finger !== undefined && !isIdle && (
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-[22%] bottom-1 h-0.5 rounded-full', FINGER_BAR[finger])}
      />
    )}
  </kbd>
);
