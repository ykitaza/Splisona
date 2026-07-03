import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { createApiKey } from './api';

function isValidPort(value: string | null): value is string {
  if (!value) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1024 && n <= 65535;
}

function isValidState(value: string | null): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9]{8,}$/.test(value);
}

export function CliAuthPage() {
  const [searchParams] = useSearchParams();
  const port = searchParams.get('port');
  const state = searchParams.get('state');

  const valid = useMemo(() => isValidPort(port) && isValidState(state), [port, state]);

  const [status, setStatus] = useState<'idle' | 'issuing' | 'error' | 'cancelled'>('idle');

  async function handleAllow() {
    if (!valid) return;
    setStatus('issuing');
    try {
      const res = await createApiKey(`CLI (${new Date().toLocaleString('ja-JP')})`);
      window.location.href = `http://127.0.0.1:${port}/callback?key=${encodeURIComponent(res.plainKey)}&state=${encodeURIComponent(state as string)}`;
    } catch {
      setStatus('error');
    }
  }

  function handleCancel() {
    window.close();
    setStatus('cancelled');
  }

  if (!valid) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: 24 }}>
        <div className="flex flex-col items-center" style={{ gap: 8, maxWidth: 360 }}>
          <span className="text-text-hi font-sans font-semibold" style={{ fontSize: 18 }}>
            無効なリクエストです
          </span>
          <p className="text-text-mid font-sans text-sm text-center">
            このページは Splisona CLI から開く必要があります。パラメータが不正、または欠落しています。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: 24 }}>
      <div className="flex flex-col items-center" style={{ gap: 24, width: '100%', maxWidth: 400 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-accent-dim)' }}
        >
          <Terminal size={22} className="text-accent" />
        </div>

        <div className="flex flex-col items-center" style={{ gap: 8 }}>
          <h1 className="text-text-hi font-sans font-semibold text-center" style={{ fontSize: 18 }}>
            Splisona CLI がこのアカウントへの
            <br />
            アクセスを要求しています
          </h1>
          <p className="text-text-mid font-sans text-sm text-center" style={{ lineHeight: 1.6 }}>
            許可すると新しい API キーが発行され、CLI に渡されます。
            <br />
            このキーはいつでも設定画面から失効できます。
          </p>
        </div>

        {status === 'error' && (
          <p className="text-danger font-sans text-xs">API キーの発行に失敗しました</p>
        )}

        {status === 'cancelled' ? (
          <p className="text-text-mid font-sans text-sm text-center">このタブを閉じてください。</p>
        ) : (
          <div className="flex flex-col items-center" style={{ gap: 12, width: '100%' }}>
            <button
              type="button"
              onClick={handleAllow}
              disabled={status === 'issuing'}
              className="flex items-center justify-center bg-accent text-white font-sans text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ width: '100%', borderRadius: 6, padding: '10px 16px' }}
            >
              {status === 'issuing' ? '発行中...' : status === 'error' ? '再試行' : '許可する'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center text-text-lo font-sans text-sm transition-colors hover:text-text-mid"
              style={{ padding: '4px 16px' }}
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
