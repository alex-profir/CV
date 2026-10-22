import { cssVar, mediaQuery, typography } from '@cv/tokens';

export const body = <p style={{ ...typography('typography.body'), color: cssVar('color.text.primary') }} />;

// Any token can set any property: only names are checked.
export const padded = <div style={{ padding: cssVar('color.text.primary') }} />;

export const gap = cssVar('space.4');

export const wide = mediaQuery('breakpoint.wide');
