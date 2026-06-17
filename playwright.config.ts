import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e/a11y',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // CI에서는 build 후 next start를 별도 step에서 실행
  // 로컬에서는 webServer 자동 기동
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run build && PORT=3100 npm run start',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
