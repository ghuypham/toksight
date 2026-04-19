import type { ComponentChildren } from 'preact';
import { theme } from '../styles/theme';

interface Props {
  label: string;
  children: ComponentChildren;
  /** Left border accent color (defaults to terracotta per mockup) */
  accent?: string;
}

/**
 * Sidebar group — matches mockup .sb-group + .sb-group-head:
 * serif label, 0.14em tracking, terracotta accent, 2px left border,
 * bottom divider between groups.
 */
export function GroupHeader({ label, children, accent }: Props) {
  const accentColor = accent ?? theme.coral;
  return (
    <section style={{
      padding: '12px 0',
      borderBottom: `1px solid ${theme.widgetBorder}`,
    }}>
      <div style={{
        fontFamily: theme.serif,
        fontSize: 10,
        fontWeight: 400,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.14em',
        color: accentColor,
        marginBottom: 8,
        paddingLeft: 6,
        borderLeft: `2px solid ${accentColor}`,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </section>
  );
}
