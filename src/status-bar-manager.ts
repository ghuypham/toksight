import * as vscode from 'vscode';
import type { MetricsData, UsageLimits } from './types';

export interface StatusBarSnapshot {
  metrics: MetricsData;
  usageLimits: UsageLimits | null;
  burnPerMin: number;       // $/min current burn
}

/** Manages the TokSight status bar item */
export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'toksight.sidebar.focus';
    this.item.tooltip = 'TokSight — Click to open sidebar';
    this.item.show();
    this.setEmpty();
  }

  /**
   * Update status bar — format: `● LIVE · 5h: 42% · burn $0.12/min`
   * Each segment is omitted if its data is unavailable (e.g. no quota → drop 5h).
   */
  update(snapshot: StatusBarSnapshot): void {
    const { metrics, usageLimits, burnPerMin } = snapshot;
    const segments: string[] = [];

    // Status segment — pulse when live, dashed dot when offline
    segments.push(metrics.isLive ? '$(pulse) LIVE' : '$(circle-slash) OFFLINE');

    // 5h quota — only when OAuth API succeeded
    if (usageLimits?.fiveHour) {
      segments.push(`5h: ${Math.round(usageLimits.fiveHour.utilization)}%`);
    }

    // Burn rate — only when there's an active session burning
    if (burnPerMin > 0) {
      segments.push(`burn ${formatBurn(burnPerMin)}/min`);
    } else if (segments.length === 1) {
      // Offline + no quota: fall back to today spend so bar isn't bare
      segments.push(`today ${formatDollars(metrics.todaySpend)}`);
    }

    this.item.text = segments.join(' · ');
  }

  /** Show empty state */
  setEmpty(): void {
    this.item.text = '$(dashboard) TokSight: No data';
  }

  /** Show error state */
  setError(message: string): void {
    this.item.text = `$(warning) TokSight: ${message}`;
    this.item.tooltip = message;
  }

  dispose(): void {
    this.item.dispose();
  }
}

function formatDollars(amount: number): string {
  if (amount < 0.01) return '$0';
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount)}`;
}

/** Burn rate format — keeps 2 decimals so small bursts ($0.04/min) stay readable */
function formatBurn(amount: number): string {
  if (amount < 0.01) return '$0.00';
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}
