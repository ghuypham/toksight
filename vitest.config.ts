import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default environment for src/test files
    environment: 'node',
    environmentMatchGlobs: [
      // Webview component tests need DOM
      ['webview/**', 'jsdom'],
    ],
  },
});
