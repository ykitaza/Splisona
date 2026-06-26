import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

async function openSettingsModal(page: import('@playwright/test').Page) {
  await page.goto('/results');
  await page.getByLabel('アカウントメニュー').click();
  await page.getByText('設定', { exact: true }).click();
}

async function goToPromptSection(page: import('@playwright/test').Page) {
  await openSettingsModal(page);
  await page.getByRole('button', { name: 'プロンプト' }).click();
}

test('設定モーダルが開閉できる', async ({ page }) => {
  await openSettingsModal(page);
  await expect(page.locator('.text-lg', { hasText: '設定' })).toBeVisible();
});

test('左ナビに4つのセクションが表示される', async ({ page }) => {
  await openSettingsModal(page);
  await expect(page.getByRole('button', { name: '一般' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Figma 連携' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI モデル' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'プロンプト' })).toBeVisible();
});

test('プロンプトセクションで4テンプレートが表示される', async ({ page }) => {
  await goToPromptSection(page);
  await expect(page.getByText('プロンプトテンプレート')).toBeVisible();
  await expect(page.getByText('ペルソナ評価')).toBeVisible();
  await expect(page.getByText('理由要約')).toBeVisible();
  await expect(page.getByRole('button', { name: 'インタビュー interview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI 下書き draft' })).toBeVisible();
});

test('テンプレート行クリックで詳細画面が開く', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByText('ペルソナ評価').click();
  await expect(page.getByText('ペルソナコンテキスト（固定）')).toBeVisible();
  await expect(page.getByText('評価指示（固定）')).toBeVisible();
  await expect(page.getByText('追加指示（任意）')).toBeVisible();
  await expect(page.getByText('保存する')).toBeVisible();
  await expect(page.getByText('デフォルトに戻す')).toBeVisible();
});

test('詳細画面の戻るボタンで一覧に戻る', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByText('ペルソナ評価').click();
  await expect(page.getByText('ペルソナコンテキスト（固定）')).toBeVisible();
  await page.getByText('プロンプトテンプレート').first().click();
  await expect(page.getByText('ペルソナコンテキスト（固定）')).not.toBeVisible();
  await expect(page.getByText('AI 下書き')).toBeVisible();
});

test('追加指示を入力して保存できる', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByText('ペルソナ評価').click();

  const textarea = page.getByPlaceholder('追加の評価基準や指示があればここに入力…');
  await textarea.fill('特にモバイル端末での使いやすさを重視してください');

  const saveBtn = page.getByText('保存する');
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByText('AI 下書き')).toBeVisible();

  await page.getByText('ペルソナ評価').click();
  await expect(textarea).toHaveValue('特にモバイル端末での使いやすさを重視してください');
});

test('デフォルトに戻すで追加指示がクリアされる', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByText('ペルソナ評価').click();

  const textarea = page.getByPlaceholder('追加の評価基準や指示があればここに入力…');
  await textarea.fill('テスト用の追加指示');

  await page.getByText('保存する').click();

  await page.getByText('ペルソナ評価').click();
  await expect(textarea).toHaveValue('テスト用の追加指示');

  await page.getByText('デフォルトに戻す').click();
  await expect(textarea).toHaveValue('');
});

test('カスタムラベルが追加指示設定済みテンプレートに表示される', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByRole('button', { name: 'インタビュー interview' }).click();

  const textarea = page.getByPlaceholder('追加の評価基準や指示があればここに入力…');
  await textarea.fill('カジュアルな口調で回答してください');
  await page.getByText('保存する').click();

  await expect(page.getByText('カスタム')).toBeVisible();
});

test('変更なしの状態で保存ボタンが無効', async ({ page }) => {
  await goToPromptSection(page);
  await page.getByText('ペルソナ評価').click();

  const saveBtn = page.getByText('保存する');
  await expect(saveBtn).toBeDisabled();
});

test('AIモデルセクションにモデル名が表示される', async ({ page }) => {
  await openSettingsModal(page);
  await page.getByRole('button', { name: 'AI モデル' }).click();
  await expect(page.getByText('Claude Sonnet 4')).toBeVisible();
});
