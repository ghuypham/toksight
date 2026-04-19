import type { ComponentChildren } from 'preact';
import { theme } from '../styles/theme';

/**
 * Shared empty state for sidebar groups.
 * Matches mockup first-launch copy: centered muted text, light padding.
 */
export function GroupEmpty({ children, tight }: { children: ComponentChildren; tight?: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: tight ? '6px 0' : '14px 0',
      fontFamily: theme.sans,
      fontSize: 11,
      lineHeight: 1.45,
      color: theme.disabledForeground,
    }}>
      {children}
    </div>
  );
}
