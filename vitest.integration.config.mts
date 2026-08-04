import { defineConfig } from 'vitest/config';

/** Integration tests run against a real database, so they need their own
    config and their own file, separate from the unit test run. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.integration.test.ts'],
    // The database has one writer, so these tests cannot run in parallel.
    fileParallelism: false,
  },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
