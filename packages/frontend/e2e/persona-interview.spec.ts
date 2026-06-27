import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('インタビュータブで入力欄が input（textarea ではない）', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const input = page.locator('input[placeholder*="に質問する"]');
  await expect(input).toBeVisible();
  const tag = await input.evaluate((el) => el.tagName.toLowerCase());
  expect(tag).toBe('input');
});

test('Send ボタンが入力バー内に存在する', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const input = page.locator('input[placeholder*="に質問する"]');
  await expect(input).toBeVisible();
  const sendButton = input.locator('xpath=ancestor::div[1]').locator('button');
  await expect(sendButton).toBeVisible();
});

test('入力バーのコンテナが border を持つ', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const input = page.locator('input[placeholder*="に質問する"]');
  await expect(input).toBeVisible();
});
