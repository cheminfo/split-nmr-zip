import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
    // The fixtures are real NMR archives of tens of megabytes, unzipped, read
    // and zipped again, which takes far longer than the 5 s default on CI.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
  },
});
