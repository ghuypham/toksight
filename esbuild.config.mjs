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

if (isWatch) {
  const extCtx = await esbuild.context(extensionConfig);
  const webCtx = await esbuild.context(webviewConfig);
  const explorerCtx = await esbuild.context(explorerConfig);
  await Promise.all([extCtx.watch(), webCtx.watch(), explorerCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
    esbuild.build(explorerConfig),
  ]);
  console.log('Build complete.');
}
