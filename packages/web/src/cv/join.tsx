// Joins rendered parts with a separator from site text.
import { Fragment } from 'react';
import type { ReactNode } from 'react';

export function joined(parts: ReactNode[], separator: string): ReactNode[] {
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && separator}
      {part}
    </Fragment>
  ));
}

// Whether a CV value is shown: a non-empty string, or a list with one.
export function present(value: unknown): boolean {
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.some(present);
  return false;
}
