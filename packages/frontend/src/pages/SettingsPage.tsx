import { useState } from 'react';
import { Figma, KeyRound, CircleCheck, CircleAlert, ShieldCheck, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'chorus_figma_token';

function maskToken(token: string): string {
  if (token.length <= 8) return '••••••••';
  return token.slice(0, 4) + '••••••••••••••••' + token.slice(-4);
}

export function SettingsPage() {
  const [savedToken, setSavedToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [editToken, setEditToken] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const isConnected = savedToken.length > 0;

  function handleSave() {
    const token = editToken.trim();
    localStorage.setItem(STORAGE_KEY, token);
    setSavedToken(token);
    setEditToken('');
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    setSavedToken('');
    setEditToken('');
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
          設定
        </h1>
        <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
          連携・AIモデル・アカウントなどを管理します
        </p>
      </div>

      {/* Section title */}
      <div className="flex flex-col gap-1">
        <h2 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 18, fontWeight: 600 }}>
          Figma 連携
        </h2>
        <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
          Figma の URL から画像を取得するために、アクセストークンが必要です
        </p>
      </div>

      {/* Connection card */}
      <div
        className="flex flex-col gap-5"
        style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10, padding: 24 }}
      >
        {/* Figma row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 44, height: 44, background: '#F7F7F8', borderRadius: 8, border: '1px solid #E6E6E8' }}
            >
              <Figma size={22} color="#1A1A1A" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
                Figma
              </span>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
                デザインの読み込み元
              </span>
            </div>
          </div>

          {isConnected ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: '#E6F4EC' }}
            >
              <CircleCheck size={13} color="#2E9E5B" />
              <span style={{ color: '#2E9E5B', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>
                接続済み
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: '#F0F1F3' }}
            >
              <CircleAlert size={13} color="#9A9A9F" />
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 600 }}>
                未接続
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: '#E6E6E8' }} />

        {/* Token field */}
        <div className="flex flex-col gap-2">
          <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
            アクセストークン
          </span>

          {isEditing ? (
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2 flex-1 rounded-md px-3"
                style={{ border: '1px solid #3B7DD8', borderRadius: 6, background: '#FFFFFF' }}
              >
                <KeyRound size={14} color="#9A9A9F" style={{ flexShrink: 0 }} />
                <input
                  type="password"
                  value={editToken}
                  onChange={(e) => setEditToken(e.target.value)}
                  placeholder="figd_xxxxxxxxxxxxxxxx"
                  autoFocus
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    padding: '10px 0',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: 13,
                    color: '#1A1A1A',
                    border: 'none',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                />
              </div>
              <button
                type="button"
                disabled={!editToken.trim()}
                onClick={handleSave}
                className="rounded-md px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ background: '#0A0A0A', color: '#FFFFFF', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                {saved ? '保存しました' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F7F7F8]"
                style={{ background: '#FFFFFF', color: '#666666', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, border: '1px solid #E6E6E8', cursor: 'pointer' }}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2 flex-1 rounded-md px-3"
                style={{ border: '1px solid #E6E6E8', borderRadius: 6, background: '#F7F7F8' }}
              >
                <KeyRound size={14} color="#9A9A9F" style={{ flexShrink: 0 }} />
                <span
                  className="flex-1"
                  style={{
                    padding: '10px 0',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: 13,
                    color: savedToken ? '#666666' : '#9A9A9F',
                    display: 'block',
                  }}
                >
                  {savedToken ? maskToken(savedToken) : 'トークン未設定'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F7F7F8]"
                style={{ background: '#FFFFFF', color: '#1A1A1A', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, border: '1px solid #E6E6E8', cursor: 'pointer' }}
              >
                更新
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        {isConnected && !isEditing && (
          <>
            <div style={{ height: 1, background: '#E6E6E8' }} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F7F7F8]"
                style={{ background: '#FFFFFF', color: '#1A1A1A', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, border: '1px solid #E6E6E8', cursor: 'pointer' }}
              >
                <RefreshCw size={14} color="#1A1A1A" />
                再接続
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#FFF5F5]"
                style={{ background: '#FFFFFF', color: '#D64545', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 13, border: '1px solid #F5C5C5', cursor: 'pointer' }}
              >
                接続を解除
              </button>
            </div>
          </>
        )}
      </div>

      {/* Permission note */}
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} color="#9A9A9F" style={{ flexShrink: 0 }} />
        <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
          file_read 権限のみを使用します。デザインの編集や書き込みは行いません。
        </p>
      </div>

      {/* How to get token */}
      <div
        className="flex flex-col gap-2 rounded-md p-4"
        style={{ background: '#F7F8FF', border: '1px solid #D6E0FA', borderRadius: 8 }}
      >
        <p style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600 }}>
          トークンの取得方法
        </p>
        <ol style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
          <li>Figma にログイン → 右上のプロフィール → Settings</li>
          <li>「Personal access tokens」セクションまでスクロール</li>
          <li>「Generate new token」をクリックしてトークンを生成</li>
          <li>生成されたトークンをコピーして上のフィールドに貼り付け</li>
        </ol>
      </div>
    </div>
  );
}
