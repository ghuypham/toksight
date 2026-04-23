import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
};

const webviewConfig = {
  entryPoints: ['webview/index.tsx'],
  bundle: true,
  outfile: 'dist/webview.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
};

const explorerConfig = {
  entryPoints: ['webview/explorer-index.tsx'],
  bundle: true,
  outfile: 'dist/explorer.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
};

// CLI bundle — standalone Node.js executable (no vscode, no webview)
const cliConfig = {
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outfile: 'dist/cli.js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
};

if (isWatch) {
  const extCtx     = await esbuild.context(extensionConfig);
  const webCtx     = await esbuild.context(webviewConfig);
  const explorerCtx= await esbuild.context(explorerConfig);
  const cliCtx     = await esbuild.context(cliConfig);
  await Promise.all([extCtx.watch(), webCtx.watch(), explorerCtx.watch(), cliCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
    esbuild.build(explorerConfig),
    esbuild.build(cliConfig),
  ]);
  console.log('Build complete.');
}
