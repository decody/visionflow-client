import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const logs: string[] = [];

    page.on('console', (message) => {
      logs.push(`[console:${message.type()}] ${message.text()}`);
    });

    page.on('pageerror', (error) => {
      logs.push(`[pageerror] ${error.message}`);
    });

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus && logs.length > 0) {
      await testInfo.attach('browser-console.log', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      });
    }
  },
});

export { expect } from '@playwright/test';
