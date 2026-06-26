import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';

vi.mock('../api/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
  putSettings: vi.fn().mockResolvedValue(undefined),
}));

import { getSettings, putSettings } from '../api/settings';
const mockGetSettings = vi.mocked(getSettings);
const mockPutSettings = vi.mocked(putSettings);

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({});
  });

  it('open=false のとき何も描画しない', () => {
    render(<SettingsModal open={false} onClose={() => {}} />);
    expect(screen.queryByText('設定')).not.toBeInTheDocument();
  });

  it('open=true のとき 4 セクションのナビが表示される', async () => {
    render(<SettingsModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getAllByText('一般').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Figma 連携')).toBeInTheDocument();
    expect(screen.getByText('AI モデル')).toBeInTheDocument();
    expect(screen.getByText('プロンプト')).toBeInTheDocument();
  });

  it('セクション切替でコンテンツが変わる', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getAllByText('一般').length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByText('AI モデル'));
    expect(screen.getByText('評価モデル')).toBeInTheDocument();
  });

  it('プロンプトセクションで 4 テンプレートが表示される', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('プロンプト')).toBeInTheDocument();
    });

    await user.click(screen.getByText('プロンプト'));
    expect(screen.getByText('評価プロンプト')).toBeInTheDocument();
  });
});
