import { theme } from '../styles/theme';
import { sendToExtension } from '../hooks/use-extension-data';
import type { WebviewData } from '../../src/types';

interface HeaderProps {
  data: WebviewData;
}

/**
 * Sidebar header — matches mockup .sb-header:
 * username (serif) on left, LIVE (pulsing green) or OFFLINE (muted mono) on right,
 * expand button tucked after the status badge.
 */
export function Header({ data }: HeaderProps) {
  const { username, isLive } = data;

  return (
    <div style={{
      padding: '12px 0 10px',
      borderBottom: `1px solid ${theme.widgetBorder}`,
      marginBottom: '2px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{
        fontFamily: theme.serif,
        fontSize: '13px',
        color: theme.foreground,
      }}>
        {username}
      </span>

      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isLive ? (
          <span
            data-testid="sb-live"
            style={{
              fontFamily: theme.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: theme.activeGreen,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.activeGreen,
              animation: 'pulse 2s infinite',
              display: 'inline-block',
            }} />
            LIVE
          </span>
        ) : (
          <span
            data-testid="sb-offline"
            style={{
              fontFamily: theme.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: theme.disabledForeground,
            }}
          >
            OFFLINE
          </span>
        )}

        <button
          onClick={() => sendToExtension('openDashboard')}
          title="Open in editor tab"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.widgetBorder}`,
            color: theme.descriptionForeground,
            fontSize: '12px',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontFamily: theme.sans,
            lineHeight: '1',
          }}
        >
          &#x26F6;
        </button>
      </span>
    </div>
  );
}
