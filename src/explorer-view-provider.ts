import * as vscode from 'vscode';
import * as crypto from 'node:crypto';
import type { ExplorerData } from './types';
import { CLAUDE_THEME_CSS } from '../webview/styles/theme';

/** Compact TokSight view in Explorer panel — 4-slide carousel with Anthropic palette */
export class ExplorerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'toksight.explorer';
  private view?: vscode.WebviewView;
  private lastData?: ExplorerData;

  constructor(private readonly extensionUri: vscode.Uri) {}

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
    // Keep webview DOM alive when user switches to another sidebar tab
    webviewView.webview.html = this.buildHtml();
    (webviewView as { retainContextWhenHidden?: boolean }).retainContextWhenHidden = true;

    // Handle in-widget actions
    webviewView.webview.onDidReceiveMessage((msg: { type: string; payload?: 'cost' | 'tokens' }) => {
      // Webview signals 'ready' after Preact mounts — replay cached data
      if (msg.type === 'ready' && this.lastData) {
        this.view?.webview.postMessage({ type: 'update', data: this.lastData });
      } else if (msg.type === 'setPrimaryUnit'
        && (msg.payload === 'cost' || msg.payload === 'tokens')) {
        vscode.workspace.getConfiguration('toksight').update(
          'primaryUnit', msg.payload, vscode.ConfigurationTarget.Global,
        );
      }
    });

    // Re-replay cached data each time the view becomes visible (covers re-mount case)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this.lastData) {
        this.view?.webview.postMessage({ type: 'update', data: this.lastData });
      }
    });

    if (this.lastData) {
      this.updateFull(this.lastData);
    }
  }

  /** Update explorer widget with enriched data */
  updateFull(data: ExplorerData): void {
    this.lastData = data;
    this.view?.webview.postMessage({ type: 'update', data });
  }

  private buildHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64url');
    const scriptUri = this.view!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'explorer.js'),
    );

    // Strict CSP: only our nonced script + inline styles. No network — the
    // extension must stay offline per the zero-network contract in CLAUDE.md.
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <style nonce="${nonce}">${CLAUDE_THEME_CSS}
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
