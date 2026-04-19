import { useState, useEffect, useRef } from 'preact/hooks';

/**
 * Smoothly animates a numeric value from previous to current using requestAnimationFrame.
 * Returns the interpolated display value that transitions over `duration` ms.
 */
export function useAnimatedValue(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const startRef = useRef(target);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const from = startRef.current;
    const to = target;

    // Skip animation if values are the same or initial render
    if (from === to) return;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;

      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

/**
 * Format an animated number as cost string.
 * Accepts the raw animated number and formats it.
 */
export function formatAnimatedCost(n: number): string {
  if (n < 0.005) return '$0';
  if (n < 1) return '$' + n.toFixed(2);
  if (n < 10) return '$' + n.toFixed(1);
  return '$' + Math.round(n);
}

/**
 * Format an animated number as percentage.
 */
export function formatAnimatedPct(n: number, decimals = 1): string {
  return (n * 100).toFixed(decimals) + '%';
}
