import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

// --- テスト一覧 ---

test('テスト一覧に2件のテストが表示される', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByText('LP比較テスト')).toBeVisible();
  await expect(page.getByText('ランディングページ改善')).toBeVisible();
});

test('テスト一覧の検索で絞り込み', async ({ page }) => {
  await page.goto('/results');
  await page.getByPlaceholder('テストを検索...').fill('LP');
  await expect(page.getByText('LP比較テスト')).toBeVisible();
  await expect(page.getByText('ランディングページ改善')).not.toBeVisible();
});

test('テスト選択モードの切替', async ({ page }) => {
  await page.goto('/results');
  await page.locator('span', { hasText: 'テストを選択' }).click();
  await expect(page.getByText('キャンセル')).toBeVisible();
  await page.getByText('キャンセル').click();
  await expect(page.getByText('キャンセル')).not.toBeVisible();
});

// --- 新規テスト作成 ---

test('新規テスト画面のフォーム構成', async ({ page }) => {
  await page.goto('/tests/new');
  await expect(page.getByText('新しい A/B テスト')).toBeVisible();
  await expect(page.getByPlaceholder(/テスト/)).toBeVisible();
  await expect(page.getByText('A案')).toBeVisible();
  await expect(page.getByText('B案')).toBeVisible();
});

test('テストタイトルが入力できる', async ({ page }) => {
  await page.goto('/tests/new');
  const input = page.getByPlaceholder(/テスト/);
  await input.fill('新しいABテスト');
  await expect(input).toHaveValue('新しいABテスト');
});

test('閉じるボタンでテスト一覧に戻る', async ({ page }) => {
  await page.goto('/tests/new');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page).toHaveURL(/\/results/);
});

// --- ペルソナ選択モーダル ---

test('ペルソナ選択モーダルで全選択ボタンが機能する', async ({ page }) => {
  await page.goto('/tests/new');
  await page.getByText('変更').click();
  const modal = page.getByTestId('modal-overlay');
  await expect(modal.getByText('ペルソナを選択')).toBeVisible();
  await expect(modal.getByText('このテストで評価させる人格を選びます')).toBeVisible();

  await modal.getByText('全選択').click();
  await expect(modal.getByText('3 / 3 体')).toBeVisible();
  await expect(modal.getByText('選択解除')).toBeVisible();

  await modal.getByText('選択解除').click();
  await expect(modal.getByText('0 / 3 体')).toBeVisible();
});

test('ペルソナ選択モーダルにフィルターチップがある', async ({ page }) => {
  await page.goto('/tests/new');
  await page.getByText('変更').click();
  await expect(page.locator('button', { hasText: 'すべて' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'デフォルト' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'カスタム' })).toBeVisible();
});

test('ペルソナ選択モーダルのフッターに対象設定ボタンがある', async ({ page }) => {
  await page.goto('/tests/new');
  await page.getByText('変更').click();
  await page.getByText('全選択').click();
  await expect(page.getByText('3体を対象に設定')).toBeVisible();
});

// --- テスト一覧のカラム ---

test('テスト一覧にステータスとペルソナ数が表示される', async ({ page }) => {
  await page.goto('/results');
  await expect(page.getByText('全 3 件')).toBeVisible();
  await expect(page.getByText('完了').first()).toBeVisible();
});

// --- テストレポート ---

test('レポート画面で勝者とスコアが表示される', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await expect(page.getByText('A案の勝ち')).toBeVisible();
});

test('レポート画面でペルソナ評価と確信度が表示される', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await expect(page.getByText('ハルト')).toBeVisible();
  await expect(page.getByText('ミサト')).toBeVisible();
  await expect(page.getByText('ユウト')).toBeVisible();
  await expect(page.getByText('85%')).toBeVisible();
});

test('レポート行展開で使用モデルと解決済みプロンプトが表示される', async ({ page }) => {
  await page.goto('/tests/t-1/report');
  await page.getByText('A案の方がCTAが目立ち行動しやすい').click();
  await expect(page.getByText('使用モデル', { exact: true })).toBeVisible();
  await expect(page.getByText('us.anthropic.claude-sonnet-4-20250514-v1:0')).toBeVisible();
  await expect(page.getByText('解決済みプロンプト', { exact: true })).toBeVisible();
});

// --- テスト実行画面 ---

test('テスト実行画面で完了状態が表示される', async ({ page }) => {
  await page.goto('/tests/t-1/running');
  await expect(page.getByText('COMPLETED')).toBeVisible();
  await expect(page.getByRole('heading', { name: '評価完了' })).toBeVisible();
  await expect(page.getByText('結果を見る')).toBeVisible();
});

test('結果を見るリンクでレポートに遷移', async ({ page }) => {
  await page.goto('/tests/t-1/running');
  await page.getByText('結果を見る').click();
  await expect(page).toHaveURL(/\/tests\/t-1\/report/);
});

test('実行中テストで中止ボタンが機能する', async ({ page }) => {
  await page.goto('/tests/t-running/running');
  await expect(page.getByText('RUNNING')).toBeVisible();
  await expect(page.getByRole('heading', { name: '実行中' })).toBeVisible();

  const abortBtn = page.getByRole('button', { name: '中止' });
  await expect(abortBtn).toBeVisible();
  await abortBtn.click();

  await expect(page.getByText('テストを中止しました')).toBeVisible();
});
