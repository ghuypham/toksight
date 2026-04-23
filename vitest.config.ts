import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Force color output so cli-renderer tests can assert ANSI escape codes
    env: { FORCE_COLOR: '1' },
    // Default environment for src/test files
    environment: 'node',
    environmentMatchGlobs: [
      // Webview component tests need DOM
      ['webview/**', 'jsdom'],
    ],
  },
});
