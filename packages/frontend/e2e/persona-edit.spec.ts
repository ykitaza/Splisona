import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('Eyebrow「ペルソナ」とタブが表示される', async ({ page }) => {
  await page.goto('/personas/p-1');
  const eyebrow = page.locator('span', { hasText: 'ペルソナ' }).first();
  await expect(eyebrow).toBeVisible();
  await expect(page.getByText('編集')).toBeVisible();
  await expect(page.getByText('インタビュー')).toBeVisible();
});

test('ラベル「表示名」が存在する', async ({ page }) => {
  await page.goto('/personas/p-1');
  await expect(page.locator('label', { hasText: '表示名' })).toBeVisible();
});

test('セクションヘッダーが mono フォント', async ({ page }) => {
  await page.goto('/personas/p-1');
  const section = page.locator('span', { hasText: '基本情報' });
  await expect(section).toBeVisible();
  const fontFamily = await section.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily).toContain('Geist Mono');
});

test('右カラムが 320px 幅', async ({ page }) => {
  await page.goto('/personas/p-1');
  const rightCol = page.locator('[style*="width: 320"]');
  await expect(rightCol).toBeVisible();
  const box = await rightCol.boundingBox();
  expect(box!.width).toBe(320);
});

test('合成プロンプトに Copy ボタンがある', async ({ page }) => {
  await page.goto('/personas/p-1');
  const toggle = page.locator('button', { hasText: '合成プロンプト' });
  await toggle.click();
  await expect(page.getByTestId('copy-prompt')).toBeVisible();
});

test('編集タブにフッターボタンが表示される', async ({ page }) => {
  await page.goto('/personas/p-3');
  await page.getByText('編集', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存する' })).toBeVisible();
});
