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

test('新規ペルソナ画面のスクリーンショット', async ({ page }) => {
  await page.goto('/personas/new');
  await page.waitForSelector('text=ペルソナを作成');
  await page.screenshot({ path: 'e2e-screenshots/persona-new.png', fullPage: true });
});

test('テスト一覧のスクリーンショット', async ({ page }) => {
  await page.goto('/results');
  await page.waitForSelector('text=A/Bテスト');
  await page.screenshot({ path: 'e2e-screenshots/test-list.png', fullPage: true });
});

test('新規テスト画面のスクリーンショット', async ({ page }) => {
  await page.goto('/tests/new');
  await page.waitForSelector('text=新規テスト');
  await page.screenshot({ path: 'e2e-screenshots/test-new.png', fullPage: true });
});
