import '@testing-library/jest-dom';
import { vi } from 'vitest';

// テスト環境では .env.local のローカル開発設定を無効化する
vi.stubEnv('VITE_LOCAL_USER_ID', '');

// jsdom はこれらを実装していないためスタブを追加
Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock-url'), writable: true });
Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
