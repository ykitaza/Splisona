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

test('/results: タイトル「A/Bテスト」とアクション', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'A/Bテスト' })).toBeVisible();
  await expect(page.locator('span', { hasText: '新規テスト' })).toBeVisible();
  await expect(page.locator('span', { hasText: 'テストを選択' })).toBeVisible();
});

test('/results: 検索バーが表示される', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByPlaceholder('テストを検索...')).toBeVisible();
});
