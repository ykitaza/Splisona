import { useEffect, useRef, useState } from 'react';
import { Share2, Check, ChevronDown } from 'lucide-react';
import { createShareLink, getShareStatus, revokeShareLink } from '@/features/test/api';
import type { ShareStatusResponse } from '@/features/test/api';
import { API_BASE, getApiErrorMessage } from '@/shared/api/client';

const SHARE_ORIGIN = import.meta.env.VITE_SHARE_ORIGIN ?? 'https://splisona-api.demo-user01.workers.dev';

function buildShareUrl(token: string): string {
  const base = API_BASE.includes('localhost') ? API_BASE : SHARE_ORIGIN;
  return `${base}/share/${token}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP');
}

export function SharePopover({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ShareStatusResponse | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getShareStatus(testId)
      .then(setStatus)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, testId]);

  async function handleIssue() {
    setError(null);
    try {
      const res = await createShareLink(testId);
      setFreshToken(res.token);
      setStatus({ shared: true, prefix: res.prefix, createdAt: res.createdAt });
      setCopied(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleReissue() {
    if (!window.confirm('既存リンクは無効になります。よろしいですか？')) return;
    await handleIssue();
  }

  async function handleRevoke() {
    if (!window.confirm('共有リンクを失効します。よろしいですか？')) return;
    setError(null);
    try {
      await revokeShareLink(testId);
      setStatus({ shared: false });
      setFreshToken(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleCopy() {
    if (!freshToken) return;
    await navigator.clipboard.writeText(buildShareUrl(freshToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center bg-surface border border-hairline text-text-mid font-sans font-medium transition-colors hover:text-text-hi"
        style={{ gap: 8, borderRadius: 10, padding: '10px 15px', fontSize: 13 }}
      >
        <Share2 size={15} />
        共有
        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.5 }} />
      </button>
      {open && (
        <div
          className="bg-raised border border-hairline"
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 6,
            borderRadius: 10, padding: 16, width: 380, zIndex: 50,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {loading ? (
            <p className="text-text-lo font-sans text-sm">読み込み中…</p>
          ) : freshToken ? (
            <div className="flex flex-col" style={{ gap: 10 }}>
              <div
                className="flex items-center bg-surface border border-hairline"
                style={{ gap: 8, borderRadius: 8, padding: '8px 10px' }}
              >
                <span
                  className="text-text-mid font-mono text-xs flex-1 min-w-0"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {buildShareUrl(freshToken)}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center font-sans font-medium text-accent transition-opacity hover:opacity-80"
                  style={{ gap: 4, fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                >
                  {copied ? <Check size={13} /> : null}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
              <p className="text-text-lo font-sans text-xs" style={{ lineHeight: 1.5 }}>
                このURLは再表示できません。失効するといつでも無効にできます。
              </p>
              <button
                type="button"
                onClick={handleRevoke}
                className="font-sans font-medium text-danger transition-opacity hover:opacity-80 text-left"
                style={{ fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                失効
              </button>
            </div>
          ) : status?.shared ? (
            <div className="flex flex-col" style={{ gap: 10 }}>
              <p className="text-text-mid font-sans text-sm">
                共有中 ·{' '}
                <span className="font-mono text-xs">{status.prefix}…</span>
                {status.createdAt ? ` · ${formatDate(status.createdAt)} 発行` : ''}
              </p>
              <p className="text-text-lo font-sans text-xs" style={{ lineHeight: 1.5 }}>
                URLは発行時にのみ表示されます。紛失した場合は再発行してください。
              </p>
              <div className="flex items-center" style={{ gap: 12 }}>
                <button
                  type="button"
                  onClick={handleReissue}
                  className="font-sans font-medium text-accent transition-opacity hover:opacity-80"
                  style={{ fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  再発行
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="font-sans font-medium text-danger transition-opacity hover:opacity-80"
                  style={{ fontSize: 12, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  失効
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              <p className="text-text-mid font-sans text-sm" style={{ lineHeight: 1.5 }}>
                リンクを知っている人は誰でも、認証なしでこのレポートを閲覧できます。
              </p>
              <button
                type="button"
                onClick={handleIssue}
                className="flex items-center justify-center bg-accent text-white font-sans font-medium transition-opacity hover:opacity-90"
                style={{ gap: 8, borderRadius: 8, padding: '9px 14px', fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                共有リンクを発行
              </button>
            </div>
          )}
          {error && (
            <p className="text-danger font-sans text-xs" style={{ marginTop: 10 }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
