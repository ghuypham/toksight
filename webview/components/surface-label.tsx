import type { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
}

/**
 * SurfaceLabel — reusable widget/dashboard section heading.
 * Georgia serif · 12px · 500 · Title Case · terracotta · 2px left border.
 * Per user feedback 2026-04-24: Title Case (not uppercase) to feel like
 * editorial section headings rather than shouty overlines.
 *
 * Use for: slide section labels ("Quota", "Today", "Session"), dashboard
 * section overlines ("Current quota", "Token economics").
 * Do NOT use for: card titles, model name rows, numeric stat values,
 * or micro column labels like Spent/Burn/Saved — those use sans overlines.
 */
export function SurfaceLabel({ children }: Props) {
  return (
    <div style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--tok-accent-primary)',
      letterSpacing: '0.01em',
      borderLeft: '2px solid var(--tok-accent-primary)',
      paddingLeft: 6,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}
