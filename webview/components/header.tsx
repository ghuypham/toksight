import { theme } from '../styles/theme';
import { sendToExtension } from '../hooks/use-extension-data';
import { quotaSeverityColor } from '../utils/quota-severity';
import type { WebviewData } from '../../src/types';

interface HeaderProps {
  data: WebviewData;
}

/** Inline animated SVG bloom — 6-petal data histogram, gentle 6s rotation */
function BloomIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <style>{`
        @keyframes bloom-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(30deg); }
        }
        .bloom-petals {
          transform-origin: 256px 256px;
          animation: bloom-spin 6s ease-in-out infinite alternate;
        }
      `}</style>
      <defs>
        <radialGradient id="hdr-base" cx="0.35" cy="0.25" r="1.1">
          <stop offset="0"   stopColor="#FFD066"/>
          <stop offset=".28" stopColor="#F79A3B"/>
          <stop offset=".62" stopColor="#E76024"/>
          <stop offset="1"   stopColor="#9E3410"/>
        </radialGradient>
        <linearGradient id="hdr-spec" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0"   stopColor="#FFFFFF" stopOpacity=".5"/>
          <stop offset=".4"  stopColor="#FFFFFF" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="hdr-petal" cx="0.45" cy="0.35" r="0.9">
          <stop offset="0"   stopColor="#FFFFFF"/>
          <stop offset=".55" stopColor="#FCE9D6"/>
          <stop offset="1"   stopColor="#E7B48B"/>
        </radialGradient>
        <clipPath id="hdr-sq">
          <path d="M 96 32 L 416 32 Q 480 32 480 96 L 480 416 Q 480 480 416 480 L 96 480 Q 32 480 32 416 L 32 96 Q 32 32 96 32 Z"/>
        </clipPath>
      </defs>

      {/* squircle background */}
      <g clipPath="url(#hdr-sq)">
        <rect width="512" height="512" fill="url(#hdr-base)"/>
        <rect width="512" height="512" fill="url(#hdr-spec)"/>
      </g>

      {/* animated bloom petals */}
      <g transform="translate(256 256)" class="bloom-petals">
        {/* petal shadows */}
        <g transform="translate(5 9)" opacity=".25">
          <ellipse cx="0" cy="-72"  rx="22" ry="60"  fill="#6B1E08"/>
          <g transform="rotate(60)" ><ellipse cx="0" cy="-92"  rx="22" ry="78"  fill="#6B1E08"/></g>
          <g transform="rotate(120)"><ellipse cx="0" cy="-130" rx="22" ry="120" fill="#6B1E08"/></g>
          <g transform="rotate(180)"><ellipse cx="0" cy="-108" rx="22" ry="96"  fill="#6B1E08"/></g>
          <g transform="rotate(240)"><ellipse cx="0" cy="-86"  rx="22" ry="72"  fill="#6B1E08"/></g>
          <g transform="rotate(300)"><ellipse cx="0" cy="-62"  rx="22" ry="50"  fill="#6B1E08"/></g>
        </g>
        {/* petals */}
        <ellipse cx="0" cy="-72"  rx="22" ry="60"  fill="url(#hdr-petal)"/>
        <g transform="rotate(60)" ><ellipse cx="0" cy="-92"  rx="22" ry="78"  fill="url(#hdr-petal)"/></g>
        <g transform="rotate(120)"><ellipse cx="0" cy="-130" rx="22" ry="120" fill="url(#hdr-petal)"/></g>
        <g transform="rotate(180)"><ellipse cx="0" cy="-108" rx="22" ry="96"  fill="url(#hdr-petal)"/></g>
        <g transform="rotate(240)"><ellipse cx="0" cy="-86"  rx="22" ry="72"  fill="url(#hdr-petal)"/></g>
        <g transform="rotate(300)"><ellipse cx="0" cy="-62"  rx="22" ry="50"  fill="url(#hdr-petal)"/></g>
        {/* center hub */}
        <circle cx="0" cy="0" r="20" fill="url(#hdr-petal)"/>
        <circle cx="-4" cy="-4" r="6"  fill="#FFFFFF" opacity=".8"/>
      </g>

      {/* gloss sheen */}
      <g clipPath="url(#hdr-sq)" opacity=".35">
        <path d="M 30 60 Q 260 110 490 60 L 490 200 Q 260 260 30 200 Z" fill="#FFFFFF" opacity=".45"/>
      </g>
    </svg>
  );
}

/** BloomIcon wrapped with a circular 5h-quota progress ring.
 *  Ring hidden when quota data unavailable (no OAuth). */
function BloomWithRing({ size = 28, quotaPct }: { size?: number; quotaPct: number | null }) {
  const ringSize = size + 8; // 36px total (28px icon + 4px ring on each side)
  const center = ringSize / 2;
  const radius = (ringSize - 4) / 2; // 2px stroke → inset 2px
  const circumference = 2 * Math.PI * radius;
  const offset = quotaPct != null ? circumference * (1 - quotaPct / 100) : circumference;
  const color = quotaPct != null ? quotaSeverityColor(quotaPct) : 'transparent';

  return (
    <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
      {/* Ring SVG behind icon */}
      {quotaPct != null && (
        <svg
          width={ringSize}
          height={ringSize}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle cx={center} cy={center} r={radius}
            fill="none" stroke="var(--tok-bar-empty, rgba(128,128,128,0.15))" strokeWidth="2.5" />
          {/* Fill */}
          <circle cx={center} cy={center} r={radius}
            fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }} />
        </svg>
      )}
      {/* Bloom icon centered */}
      <div style={{
        position: 'absolute',
        top: (ringSize - size) / 2,
        left: (ringSize - size) / 2,
      }}>
        <BloomIcon size={size} />
      </div>
    </div>
  );
}

/**
 * Sidebar header — animated bloom icon left, username centre, LIVE/OFFLINE + expand right.
 */
export function Header({ data }: HeaderProps) {
  const { username, isLive, usageLimits, usageLimitsStatus } = data;
  const quotaPct = usageLimitsStatus === 'ok' && usageLimits?.fiveHour
    ? usageLimits.fiveHour.utilization
    : null;

  return (
    <div style={{
      padding: '10px 0',
      borderBottom: `1px solid ${theme.widgetBorder}`,
      marginBottom: '2px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* bloom icon with 5h quota ring */}
      <BloomWithRing size={28} quotaPct={quotaPct} />

      {/* username */}
      <span style={{
        fontFamily: theme.serif,
        fontSize: '13px',
        color: theme.foreground,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {username}
      </span>

      {/* live badge + expand button */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
