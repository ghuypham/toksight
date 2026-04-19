import * as vscode from 'vscode';
import * as crypto from 'node:crypto';
import type { WebviewData } from './types';
import { CLAUDE_THEME_CSS } from '../webview/styles/theme';

/** Full-screen dashboard panel using same Preact app as sidebar */
export class DashboardPanelProvider {
  public static readonly viewType = 'toksight.dashboard';
  private panel?: vscode.WebviewPanel;
  private lastData?: WebviewData;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Open or focus the dashboard panel */
  open(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      DashboardPanelProvider.viewType,
      'TokSight Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
      },
    );

    this.panel.webview.html = this.buildHtml();

    this.panel.webview.onDidReceiveMessage((msg: { type: string }) => {
      if (msg.type === 'ready' && this.lastData) {
        this.panel?.webview.postMessage({ type: 'update', data: this.lastData });
        this.panel?.webview.postMessage({ type: 'mode', data: 'editor' });
      }
    });

    this.panel.onDidDispose(() => { this.panel = undefined; });
  }

  /** Push data update to panel */
  update(data: WebviewData): void {
    this.lastData = data;
    if (this.panel) {
      this.panel.webview.postMessage({ type: 'update', data });
    }
  }

  private buildHtml(): string {
    const nonce = crypto.randomBytes(16).toString('base64url');
    const scriptUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style nonce="${nonce}">${CLAUDE_THEME_CSS}</style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
