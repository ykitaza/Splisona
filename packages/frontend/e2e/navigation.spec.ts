import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('ルートパスはペルソナ一覧にリダイレクト', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/personas/);
  await expect(page.getByRole('heading', { name: 'ペルソナ管理' })).toBeVisible();
});

test('サイドバーの「新規A/Bテスト」リンク', async ({ page }) => {
  await page.goto('/personas');
  await page.getByText('新規A/Bテスト').click();
  await expect(page).toHaveURL(/\/tests\/new/);
});

test('サイドバーの「A/Bテスト」リンク', async ({ page }) => {
  await page.goto('/personas');
  await page.getByText('A/Bテスト', { exact: true }).click();
  await expect(page).toHaveURL(/\/results/);
});

test('サイドバーの「ペルソナ」リンク', async ({ page }) => {
  await page.goto('/results');
  await page.getByText('ペルソナ', { exact: true }).click();
  await expect(page).toHaveURL(/\/personas/);
});

test('ペルソナカードからペルソナ詳細に遷移', async ({ page }) => {
  await page.goto('/personas');
  await page.waitForSelector('text=ハルト');
  await page.locator('[style*="width: 30"]').first().click();
  await page.locator('button', { hasText: '詳細' }).first().click();
  await expect(page).toHaveURL(/\/personas\/p-1/);
});

test('テスト一覧から新規テストに遷移', async ({ page }) => {
  await page.goto('/results');
  await page.locator('span', { hasText: '新規テスト' }).click();
  await expect(page).toHaveURL(/\/tests\/new/);
});

test('Aboutモーダルが開く', async ({ page }) => {
  await page.goto('/personas');
  await page.getByLabel('アカウントメニュー').click();
  await page.getByText('Chorus について').click();
  await expect(page.getByTestId('about-modal-content')).toBeVisible();
  await expect(page.getByTestId('about-modal-content').getByText('AI PERSONA REVIEW')).toBeVisible();
});
