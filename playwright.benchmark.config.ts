import { defineConfig } from '@playwright/test';

import browserConfig from './playwright.config.js';

export default defineConfig({
  ...browserConfig,
  testDir: './benchmarks',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
