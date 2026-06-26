import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('/tests/new: Eyebrow「新規テスト」と Close ボタン', async ({ page }) => {
  await page.goto('/tests/new');
  const eyebrow = page.locator('span', { hasText: '新規テスト' }).first();
  await expect(eyebrow).toBeVisible();
  await expect(page.getByRole('button', { name: '閉じる', exact: true })).toBeVisible();
});

test('/tests/new: タイトル「新しい A/B テスト」', async ({ page }) => {
  await page.goto('/tests/new');
  await expect(page.getByText('新しい A/B テスト')).toBeVisible();
});

test('/results: タイトル「A/Bテスト」とカウント', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'A/Bテスト' })).toBeVisible();
  await expect(page.locator('span', { hasText: /全 \d+ 件/ })).toBeVisible();
});

test('/results: テーブルヘッダーにカラム名が表示される', async ({ page }) => {
  await page.goto('/results');
  await expect(page.locator('span', { hasText: 'プレビュー' })).toBeVisible();
  await expect(page.locator('span', { hasText: 'テスト名' })).toBeVisible();
  await expect(page.locator('span', { hasText: 'ステータス' })).toBeVisible();
});
