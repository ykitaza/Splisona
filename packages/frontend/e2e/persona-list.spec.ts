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

test('ペルソナ一覧のヘッダーとフィルタ', async ({ page }) => {
  await page.goto('/personas');
  await expect(page.locator('text=PHASE 2 · PERSONAS')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ペルソナ管理' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'すべて' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'デフォルト' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'カスタム' })).toBeVisible();
});
