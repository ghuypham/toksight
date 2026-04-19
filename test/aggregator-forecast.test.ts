import { describe, it, expect } from 'vitest';
import { computeForecast } from '../src/data-aggregator';

describe('computeForecast', () => {
  it('returns null when burn rate is 0', () => {
    expect(computeForecast({ remainingUsd: 10, burnPerMin: 0 })).toBeNull();
  });

  it('returns null when remainingUsd is <= 0', () => {
    expect(computeForecast({ remainingUsd: 0, burnPerMin: 0.5 })).toBeNull();
  });

  it('computes minutes until budget exhausted', () => {
    const r = computeForecast({ remainingUsd: 2.4, burnPerMin: 0.08 });
    expect(r?.etaMinutes).toBe(30);
    expect(r?.burnPerMin).toBe(0.08);
  });

  it('rounds eta down to nearest minute', () => {
    const r = computeForecast({ remainingUsd: 1, burnPerMin: 0.3 });
    expect(r?.etaMinutes).toBe(3); // floor(3.33)
  });
});
