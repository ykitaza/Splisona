import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('インタビュータブで入力欄が input（textarea ではない）', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const input = page.locator('input[placeholder*="メッセージを入力"]');
  await expect(input).toBeVisible();
  const tag = await input.evaluate((el) => el.tagName.toLowerCase());
  expect(tag).toBe('input');
});

test('Send ボタンが入力バー内に存在する', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const inputBar = page.locator('.rounded-md.bg-base.border-hairline');
  await expect(inputBar).toBeVisible();
  const sendButton = inputBar.locator('button');
  await expect(sendButton).toBeVisible();
});

test('入力バーのコンテナが border を持つ', async ({ page }) => {
  await page.goto('/personas/p-1');
  await page.getByText('インタビュー').click();
  const container = page.locator('input[placeholder*="メッセージを入力"]').locator('xpath=ancestor::div[contains(@class,"rounded-md")]');
  await expect(container).toBeVisible();
  const border = await container.evaluate((el) => getComputedStyle(el).borderStyle);
  expect(border).toBe('solid');
});
