import * as vscode from 'vscode';
import * as crypto from 'node:crypto';
import type { WebviewData } from './types';
import { CLAUDE_THEME_CSS } from '../webview/styles/theme';

/** Provides the sidebar webview panel */
export class TokSightViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'toksight.sidebar';
  private view?: vscode.WebviewView;

  private lastData?: WebviewData;
  private lastSettings?: { carouselInterval: number; primaryUnit: 'cost' | 'tokens' };
  private onResolve?: () => void;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Register callback for when webview first resolves */
  onDidResolve(cb: () => void): void {
    this.onResolve = cb;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Listen for messages from webview
    webviewView.webview.onDidReceiveMessage((message: { type: string; payload?: unknown }) => {
      // Webview sends 'ready' after Preact mounts → replay cached data
      if (message.type === 'ready') {
        if (this.lastData) {
          this.postMessage(this.lastData);
        }
        if (this.lastSettings) {
          this.postSettings(this.lastSettings);
        }
        // Also trigger fresh data from watcher
        this.onResolve?.();
      } else if (message.type === 'openDashboard') {
        vscode.commands.executeCommand('toksight.openDashboard');
      } else if (message.type === 'setPrimaryUnit'
        && (message.payload === 'cost' || message.payload === 'tokens')) {
        vscode.workspace.getConfiguration('toksight').update(
          'primaryUnit', message.payload, vscode.ConfigurationTarget.Global,
        );
      }
    });
  }

  /** Send data to webview (caches for late-resolving webviews) */
  postMessage(data: WebviewData): void {
    this.lastData = data;
    this.view?.webview.postMessage({ type: 'update', data });
  }

  /** Send settings to webview (caches for late-resolving webviews) */
  postSettings(settings: { carouselInterval: number; primaryUnit: 'cost' | 'tokens' }): void {
    this.lastSettings = settings;
    this.view?.webview.postMessage({ type: 'settings', data: settings });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <title>TokSight</title>
  <style nonce="${nonce}">${CLAUDE_THEME_CSS}
    /* Match standard VS Code sidebar inset (Explorer/SCM use ~8px horizontal). */
    body { margin: 0; padding: 0 8px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}
