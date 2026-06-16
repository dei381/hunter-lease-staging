import { defineConfig, configDefaults } from 'vitest/config';

// Unit tests only. The Playwright E2E specs in e2e/ use a different runner and must
// not be picked up by Vitest.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Gate the critical, well-tested module so its coverage can never silently regress.
      // The rest of the codebase is reported (text/html) but not yet gated; raise coverage
      // first, then add more files here.
      thresholds: {
        'server/services/engine/HunterScore.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
