import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e-production',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
  },
  webServer: {
    command: 'node scripts/serve-repo.mjs',
    url: 'http://127.0.0.1:4174/site-world/test/fixtures/production-host.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
