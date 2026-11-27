import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      REQUEST_TIMEOUT_MS: '60000',
      AI_REQUEST_TIMEOUT_MS: '90000'
    }
  }
});
