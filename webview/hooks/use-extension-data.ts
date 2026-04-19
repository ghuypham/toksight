import { useState, useEffect } from 'preact/hooks';
import type { WebviewData, PrimaryUnit } from '../../src/types';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

// Lazy init — only call acquireVsCodeApi in webview context, not during tests/imports
let _vscode: VsCodeApi | undefined;
function getVsCodeApi(): VsCodeApi {
  if (!_vscode) _vscode = acquireVsCodeApi();
  return _vscode;
}

interface ExtensionState {
  data: WebviewData | null;
  settings: { carouselInterval: number; primaryUnit: PrimaryUnit };
  mode: 'sidebar' | 'editor';
}

/** Hook to receive data from extension host via postMessage */
export function useExtensionData(): ExtensionState {
  const [data, setData] = useState<WebviewData | null>(null);
  const [settings, setSettings] = useState<{ carouselInterval: number; primaryUnit: PrimaryUnit }>(
    { carouselInterval: 5000, primaryUnit: 'cost' },
  );
  const [mode, setMode] = useState<'sidebar' | 'editor'>('sidebar');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'update') {
        setData(message.data as WebviewData);
      } else if (message.type === 'settings') {
        setSettings(message.data);
      } else if (message.type === 'mode') {
        setMode(message.data as 'sidebar' | 'editor');
      }
    };

    window.addEventListener('message', handler);

    // Signal to extension host that webview is mounted and ready for data
    getVsCodeApi().postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, []);

  return { data, settings, mode };
}

/** Send message back to extension host */
export function sendToExtension(type: string, payload?: unknown): void {
  getVsCodeApi().postMessage({ type, payload });
}
