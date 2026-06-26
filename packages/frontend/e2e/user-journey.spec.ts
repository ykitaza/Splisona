import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('ペルソナ一覧→テスト作成→実行→レポート閲覧の全フロー', async ({ page }) => {
  await page.goto('/personas');
  await expect(page.getByText('ハルト')).toBeVisible();

  await page.getByText('新規A/Bテスト').click();
  await expect(page).toHaveURL(/\/tests\/new/);
  await expect(page.getByText('新しい A/B テスト')).toBeVisible();

  await page.getByPlaceholder(/テスト/).fill('ジャーニーテスト');

  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page).toHaveURL(/\/results/);

  const row = page.getByText('LP比較テスト');
  await row.click();
  await expect(page).toHaveURL(/\/tests\/t-1\/report/);
  await expect(page.getByText('A案の勝ち')).toBeVisible();
});

test('テスト一覧→レポート→ペルソナ評価の展開', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await expect(page.getByText('結果レポート')).toBeVisible();
  await expect(page.getByText('ハルト')).toBeVisible();

  // 行をクリックして展開（ペルソナ名ではなくコメント部分をクリック）
  await page.getByText('A案の方がCTAが目立ち行動しやすい').click();
  await expect(page.getByText('コメント全文')).toBeVisible();
  await expect(page.getByText('使用モデル', { exact: true })).toBeVisible();
  await expect(page.getByText('評価軸別スコア')).toBeVisible();
});

test('ペルソナ名クリックで属性ポップオーバーが表示される', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await page.getByTestId('persona-name-p-1').click();
  await expect(page.getByTestId('attribute-popover')).toBeVisible();
  await expect(page.getByText('ペルソナ属性')).toBeVisible();
  await expect(page.getByTestId('attribute-popover').getByText('行動重視型')).toBeVisible();
});

test('テスト一覧の一括選択→削除確認モーダル', async ({ page }) => {
  await page.goto('/results');
  await page.locator('span', { hasText: 'テストを選択' }).click();
  await expect(page.getByText('0件を選択中')).toBeVisible();

  await page.getByText('LP比較テスト').click();
  await expect(page.getByText('1件を選択中')).toBeVisible();

  await page.getByText('ランディングページ改善').click();
  await expect(page.getByText('2件を選択中')).toBeVisible();

  await page.getByText('2件を削除').click();
  await expect(page.getByText('テストを削除しますか？')).toBeVisible();
});

test('テスト実行画面→レポートへの遷移', async ({ page }) => {
  await page.goto('/tests/t-1/running');
  await expect(page.getByRole('heading', { name: '評価完了' })).toBeVisible();
  await expect(page.getByText('COMPLETED')).toBeVisible();

  const progressText = page.locator('.font-mono', { hasText: /\/.*体 完了/ });
  await expect(progressText).toBeVisible();

  await page.getByText('結果を見る').click();
  await expect(page).toHaveURL(/\/tests\/t-1\/report/);
});

test('レポートの比較セクションとレーダーチャートが表示される', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await expect(page.getByText('比較したデザイン')).toBeVisible();
  await expect(page.getByText('A案', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('B案', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('評価軸別の比較')).toBeVisible();
  await expect(page.getByText('評価のまとめ')).toBeVisible();
});

test('設定モーダルをペルソナ画面から開閉できる', async ({ page }) => {
  await page.goto('/personas');
  await page.getByLabel('アカウントメニュー').click();
  await page.getByText('設定').click();
  await expect(page.locator('.text-lg', { hasText: '設定' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('設定のFigma連携セクションに接続状態が表示される', async ({ page }) => {
  await page.goto('/personas');
  await page.getByLabel('アカウントメニュー').click();
  await page.getByText('設定').click();
  await page.getByText('Figma 連携').click();
  await expect(page.getByText('接続状態')).toBeVisible();
  await expect(page.getByText('未接続')).toBeVisible();
  await expect(page.getByText('トークンの取得方法')).toBeVisible();
});
