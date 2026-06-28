import { describe, it, expect } from 'vitest';
import { ApiError, getApiErrorMessage } from './client';

describe('getApiErrorMessage', () => {
  it('ApiError 401 → 認証エラーメッセージを返す', () => {
    expect(getApiErrorMessage(new ApiError(401, 'Unauthorized'))).toBe(
      '認証が必要です。再度サインインしてください'
    );
  });

  it('ApiError 404 → 未発見メッセージを返す', () => {
    expect(getApiErrorMessage(new ApiError(404, 'Not Found'))).toBe(
      'リソースが見つかりませんでした'
    );
  });

  it('ApiError 409 → 重複エラーメッセージを返す', () => {
    expect(getApiErrorMessage(new ApiError(409, 'Conflict'))).toBe(
      '操作が重複しています。少し待ってから再試行してください'
    );
  });

  it('ApiError 503 → サービス停止メッセージを返す', () => {
    expect(getApiErrorMessage(new ApiError(503, 'Service Unavailable'))).toBe(
      'AIサービスが一時的に利用できません。しばらく後でお試しください'
    );
  });

  it('ApiError 400 → APIが返したメッセージをそのまま返す', () => {
    expect(getApiErrorMessage(new ApiError(400, '表示名は必須です'))).toBe('表示名は必須です');
  });

  it('ApiError 500 → APIが返したメッセージをそのまま返す', () => {
    expect(getApiErrorMessage(new ApiError(500, 'Internal Server Error'))).toBe(
      'Internal Server Error'
    );
  });

  it('通常のError → メッセージをそのまま返す', () => {
    expect(getApiErrorMessage(new Error('ネットワークエラー'))).toBe('ネットワークエラー');
  });

  it('unknown値 → フォールバックメッセージを返す', () => {
    expect(getApiErrorMessage('unknown')).toBe('予期しないエラーが発生しました');
    expect(getApiErrorMessage(null)).toBe('予期しないエラーが発生しました');
  });
});
