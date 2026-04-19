import { useState, useEffect, useRef } from 'preact/hooks';
import type { ExplorerData } from '../src/types';
import { theme } from './styles/theme';
import { getModelColor as modelColor, getModelFamilyName } from './utils/model-utils';
import { SlideQuota } from './explorer/slide-quota';
import { SlideSessionNow } from './explorer/slide-session-now';
import { SlideRecap } from './explorer/slide-recap';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
let _vs: ReturnType<typeof acquireVsCodeApi> | undefined;
function getVs() { if (!_vs) _vs = acquireVsCodeApi(); return _vs; }

const MAX_SLIDES = 3;
const ROTATE_MS = 12000;  // slower cadence — users need time to read each slide

/**
 * ExplorerApp — widget carousel per mockup §1:
 *   Slide 1 QUOTA · Slide 2 SESSION NOW · Slide 3 LAST SESSION (recap, optional)
 * Header is dynamic: live dot + active model + slide counter (1/N).
 * Smart default: when an active session appears and user hasn't navigated
 * manually, jump to Slide 2 (the actionable "right now" view).
 * Auto-rotates every 12s; paused on hover; respects prefers-reduced-motion.
 * When no latestRecap, slide 3 is hidden — carousel cycles 1 ↔ 2 only.
 */
export function ExplorerApp() {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const userNavigatedRef = useRef(false);  // once user clicks, never auto-jump again

  const hasRecap = !!data?.latestRecap;
  const visibleSlides = hasRecap ? MAX_SLIDES : 2;  // gate slide 3 behind recap data

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'update') setData(e.data.data as ExplorerData);
    };
    window.addEventListener('message', handler);
    getVs().postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  // Smart default — jump to Session slide when an active session is detected
  useEffect(() => {
    if (userNavigatedRef.current) return;
    if (data?.activeSessionDetail && slide === 0) setSlide(1);
  }, [data?.activeSessionDetail, slide]);

  // Snap back if current slide exceeds visible count (e.g. recap data goes away)
  useEffect(() => {
    if (slide >= visibleSlides) setSlide(0);
  }, [visibleSlides, slide]);

  const userSetSlide = (i: number) => {
    if (i >= visibleSlides) return;
    userNavigatedRef.current = true;
    setSlide(i);
  };

  // Auto-rotate — pauses on hover + respects reduced-motion
  useEffect(() => {
    if (paused) return;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;
    const timer = setInterval(() => setSlide(s => (s + 1) % visibleSlides), ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, slide, visibleSlides]);

  return (
    <div
      style={{ padding: '10px 12px 12px', fontFamily: theme.sans, fontSize: 12, overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
        {/* Header — live dot + active model (Claude brand palette) */}
        {(data?.isLive || data?.activeModel) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, minHeight: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {data?.isLive && (
                <span title="Claude Code session active" style={{ width: 7, height: 7, borderRadius: '50%', background: theme.activeGreen, flexShrink: 0, display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite' }} />
              )}
              <span style={{ fontFamily: theme.sans, fontSize: 9, color: 'var(--vscode-disabledForeground)', letterSpacing: '0.5px' }}>
                {slide + 1}/{visibleSlides}
              </span>
            </div>
            {data?.activeModel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: modelColor(data.activeModel),
                  flexShrink: 0, display: 'inline-block',
                }} />
                <span style={{ fontFamily: theme.sans, fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                  {getModelFamilyName(data.activeModel)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Carousel — N single-purpose slides (slide 3 gated by hasRecap) */}
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${slide * 100}%)` }}>
            {Array.from({ length: visibleSlides }, (_, i) => (
              <div key={i} style={{ minWidth: '100%', flexShrink: 0, minHeight: 140 }}>
                {data ? (
                  i === 0 ? <SlideQuota data={data} /> :
                  i === 1 ? <SlideSessionNow data={data} /> :
                  <SlideRecap data={data} />
                ) : (
                  <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Loading…</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dots — render only as many as visibleSlides; coral accent for active */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {Array.from({ length: visibleSlides }, (_, i) => (
            <button
              key={i}
              onClick={() => userSetSlide(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === slide ? theme.coral : 'var(--vscode-descriptionForeground)',
                opacity: i === slide ? 1 : 0.3,
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'opacity 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(76,175,80,0.45); }
          50% { box-shadow: 0 0 0 4px rgba(76,175,80,0); }
        }
      `}</style>
    </div>
  );
}
