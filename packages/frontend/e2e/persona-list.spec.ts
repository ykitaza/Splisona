import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('ペルソナ一覧のスクリーンショット', async ({ page }) => {
  await page.goto('/personas');
  await page.waitForSelector('text=ペルソナ管理');
  await page.screenshot({ path: 'e2e-screenshots/persona-list.png', fullPage: true });
});
