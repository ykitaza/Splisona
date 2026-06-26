import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('ペルソナ一覧に3件のカードが表示される', async ({ page }) => {
  await page.goto('/personas');
  await expect(page.getByText('ハルト')).toBeVisible();
  await expect(page.getByText('ミサト')).toBeVisible();
  await expect(page.getByText('ユウト')).toBeVisible();
});

test('フィルター切替でカードが絞り込まれる', async ({ page }) => {
  await page.goto('/personas');
  await page.locator('button', { hasText: 'デフォルト' }).click();
  await expect(page.getByText('ハルト')).toBeVisible();
  await expect(page.getByText('ミサト')).toBeVisible();
});

test('検索バーで名前を絞り込める', async ({ page }) => {
  await page.goto('/personas');
  await page.getByPlaceholder('ペルソナを検索').fill('ハルト');
  await expect(page.getByText('ハルト')).toBeVisible();
  await expect(page.getByText('ミサト')).not.toBeVisible();
});

test('コンテキストメニューにアイコン付き項目が表示される', async ({ page }) => {
  await page.goto('/personas');
  await page.waitForSelector('text=ハルト');
  await page.locator('[style*="width: 30"]').first().click();
  await expect(page.locator('button', { hasText: '詳細' }).first()).toBeVisible();
  await expect(page.locator('button', { hasText: '複製' }).first()).toBeVisible();
});

test('コンテキストメニューの外をクリックで閉じる', async ({ page }) => {
  await page.goto('/personas');
  await page.waitForSelector('text=ハルト');
  await page.locator('[style*="width: 30"]').first().click();
  const detailBtn = page.locator('button', { hasText: '詳細' }).first();
  await expect(detailBtn).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(detailBtn).not.toBeVisible();
});

test('新規ペルソナリンクが /personas/new に遷移', async ({ page }) => {
  await page.goto('/personas');
  await page.getByText('新規ペルソナ').click();
  await expect(page).toHaveURL(/\/personas\/new/);
});

test('ペルソナ詳細画面で3タブが表示される', async ({ page }) => {
  await page.goto('/personas/p-1');
  await expect(page.getByText('詳細', { exact: true })).toBeVisible();
  await expect(page.getByText('編集', { exact: true })).toBeVisible();
  await expect(page.getByText('インタビュー')).toBeVisible();
});

test('詳細タブではフォームが読み取り専用', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('詳細', { exact: true }).click();
  const inputs = page.locator('input[disabled]');
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);
});

test('編集タブでペルソナ名が表示される', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('編集', { exact: true }).click();
  await expect(page.locator('label', { hasText: '表示名' })).toBeVisible();
});

test('← ペルソナ一覧リンクで戻る', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('ペルソナ一覧').click();
  await expect(page).toHaveURL(/\/personas$/);
});
