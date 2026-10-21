import { cn } from 'cn';
import type { ComponentProps } from 'react';

const VARIANTS = {
  primary: 'bg-ink text-paper hover:bg-ink/85',
  secondary: 'bg-card text-ink shadow-[inset_0_0_0_1px_var(--input)] hover:bg-sunken',
} as const;

const BASE =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors select-none disabled:opacity-50';

export const Button = ({
  variant = 'secondary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof VARIANTS }) => (
  <button type="button" className={cn(BASE, VARIANTS[variant], className)} {...props} />
);

/** A link styled as a button, for the checkouts. */
export const ButtonLink = ({
  variant = 'secondary',
  className,
  ...props
}: ComponentProps<'a'> & { variant?: keyof typeof VARIANTS }) => (
  <a
    target="_blank"
    rel="noreferrer"
    className={cn(BASE, VARIANTS[variant], className)}
    {...props}
  />
);
