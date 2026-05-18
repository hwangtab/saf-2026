import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/a11y',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
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
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
