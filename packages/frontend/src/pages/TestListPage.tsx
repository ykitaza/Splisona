import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { ABTEST_STATUS_LABELS, type ABTestStatus } from '../types';
import { Plus, ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<ABTestStatus, { bg: string; text: string }> = {
  draft: { bg: '#F0F1F3', text: '#666666' },
  running: { bg: '#E8F0FB', text: '#3B7DD8' },
  completed: { bg: '#E6F4EC', text: '#2E9E5B' },
  failed: { bg: '#FDEAEA', text: '#D64545' },
};

export function TestListPage() {
  const { tests, isLoading } = useABTests();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  function handleClick(testId: string, status: ABTestStatus) {
    if (status === 'running') navigate(`/tests/${testId}/running`);
    else if (status === 'completed' || status === 'failed') navigate(`/tests/${testId}/report`);
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-10">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            結果レポート
          </h1>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            実行済みの A/B テスト一覧
          </p>
        </div>
        <Link
          to="/tests/new"
          className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: '#0A0A0A', borderRadius: 6 }}
        >
          <Plus size={16} color="#FFFFFF" />
          新しいA/Bテスト
        </Link>
      </div>

      {tests.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>テストがありません</p>
          <Link
            to="/tests/new"
            className="mt-3 text-sm font-medium"
            style={{ color: '#3B7DD8' }}
          >
            最初のテストを作成する
          </Link>
        </div>
      ) : (
        <div
          className="overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
        >
          <div className="flex items-center" style={{ background: '#F0F1F3', padding: '12px 20px' }}>
            <div className="flex-1">
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>テスト名</span>
            </div>
            <div style={{ width: 90 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ペルソナ</span>
            </div>
            <div style={{ width: 120 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ステータス</span>
            </div>
            <div style={{ width: 96 }}>
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>日付</span>
            </div>
            <div style={{ width: 40 }} />
          </div>

          {tests.map((test, i) => {
            const colors = STATUS_COLORS[test.status];
            const isClickable = test.status !== 'draft';
            return (
              <div
                key={test.testId}
                className="flex items-center"
                style={{
                  padding: '15px 20px',
                  borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
                  cursor: isClickable ? 'pointer' : 'default',
                }}
                onClick={() => isClickable && handleClick(test.testId, test.status)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => e.key === 'Enter' && isClickable && handleClick(test.testId, test.status)}
              >
                <div className="flex-1 flex flex-col gap-0.5">
                  <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500 }}>
                    {test.title}
                  </span>
                </div>
                <div style={{ width: 90 }}>
                  <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                    {test.personaIds.length}人
                  </span>
                </div>
                <div style={{ width: 120 }}>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: colors.bg, color: colors.text, borderRadius: 9999 }}
                  >
                    {ABTEST_STATUS_LABELS[test.status]}
                  </span>
                </div>
                <div style={{ width: 96 }}>
                  <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
                    {new Date(test.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
                <div style={{ width: 40 }} className="flex justify-end">
                  {isClickable && <ArrowRight size={16} color="#9A9A9F" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
