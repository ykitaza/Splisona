import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { usePersonas } from '../hooks/usePersonas';
import { ABTEST_STATUS_LABELS, type ABTestStatus, type DesignInput } from '../types';
import { FlaskConical, Users, CalendarCheck, ArrowRight, Plus } from 'lucide-react';
import { API_BASE } from '../api/client';

function DesignThumb({ input, label }: { input: DesignInput; label: string }) {
  const src = input.imageKey ? `${API_BASE}/stub-upload/${input.imageKey}` : null;
  return (
    <div
      className="overflow-hidden flex-shrink-0"
      style={{ width: 68, height: 40, borderRadius: 5, background: '#F0F1F3', border: '1px solid #E6E6E8' }}
    >
      {src && <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  );
}

const STATUS_COLORS: Record<ABTestStatus, { bg: string; text: string }> = {
  draft: { bg: '#F0F1F3', text: '#666666' },
  running: { bg: '#E8F0FB', text: '#3B7DD8' },
  completed: { bg: '#E8F0FB', text: '#3B7DD8' },
  failed: { bg: '#FDEAEA', text: '#D64545' },
};


export function DashboardPage() {
  const { tests, isLoading: testsLoading } = useABTests();
  const { personas } = usePersonas();
  const navigate = useNavigate();

  if (testsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const completedTests = tests.filter((t) => t.status === 'completed');
  const thisMonthTests = tests.filter((t) => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  function handleTestClick(testId: string, status: ABTestStatus) {
    if (status === 'running') {
      navigate(`/tests/${testId}/running`);
    } else if (status === 'completed' || status === 'failed') {
      navigate(`/tests/${testId}/report`);
    }
  }

  const metrics = [
    {
      label: '実行したテスト',
      icon: FlaskConical,
      value: String(tests.length),
      sub: completedTests.length > 0 ? `${completedTests.length}件完了` : '0件完了',
      subColor: '#2E9E5B',
    },
    {
      label: '登録ペルソナ',
      icon: Users,
      value: String(personas.length),
      sub: '',
      subColor: '#9A9A9F',
    },
    {
      label: '今月のテスト',
      icon: CalendarCheck,
      value: String(thisMonthTests.length),
      sub: '件',
      subColor: '#9A9A9F',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-8 pb-10" style={{ minHeight: '100%' }}>
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 28, fontWeight: 600 }}>
            ダッシュボード
          </h1>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
            おかえりなさい、山田さん
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

      {/* Metric Row */}
      <div className="grid grid-cols-3 gap-5">
        {metrics.map(({ label, icon: Icon, value, sub, subColor }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-md p-5"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E8', borderRadius: 10 }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>{label}</span>
              <Icon size={16} color="#9A9A9F" />
            </div>
            <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
              {value}
            </span>
            <span style={{ color: subColor, fontFamily: 'Geist, sans-serif', fontSize: 12 }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Recent Tests */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 600 }}>
            最近のテスト
          </span>
          <Link
            to="/results"
            className="flex items-center gap-1"
            style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}
          >
            すべて見る
            <ArrowRight size={14} color="#3B7DD8" />
          </Link>
        </div>

        {tests.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
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
            {/* Table Header */}
            <div
              className="flex items-center justify-between"
              style={{ background: '#F0F1F3', padding: '12px 20px' }}
            >
              <div style={{ width: 210, flexShrink: 0 }}>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>テスト名</span>
              </div>
              <div style={{ width: 170, flexShrink: 0 }}>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>プレビュー</span>
              </div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>ペルソナ</span>
              </div>
              <div style={{ width: 140, flexShrink: 0 }}>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>結果</span>
              </div>
              <div style={{ width: 120, flexShrink: 0 }}>
                <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: '0.5px' }}>日付</span>
              </div>
            </div>

            {/* Table Rows */}
            {tests.slice(0, 10).map((test, i) => {
              const colors = STATUS_COLORS[test.status];
              const isClickable = test.status === 'running' || test.status === 'completed' || test.status === 'failed';
              return (
                <div
                  key={test.testId}
                  className="flex items-center justify-between"
                  style={{
                    padding: '15px 20px',
                    borderTop: i > 0 ? '1px solid #E6E6E8' : 'none',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                  onClick={() => isClickable && handleTestClick(test.testId, test.status)}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => e.key === 'Enter' && isClickable && handleTestClick(test.testId, test.status)}
                >
                  <div style={{ width: 210, flexShrink: 0, overflow: 'hidden' }}>
                    <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {test.title}
                    </span>
                  </div>
                  <div className="flex items-center flex-shrink-0" style={{ width: 170, gap: 8 }}>
                    <DesignThumb input={test.designAInput} label="A" />
                    <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>vs</span>
                    <DesignThumb input={test.designBInput} label="B" />
                  </div>
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <span style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
                      {test.personaIds.length}人
                    </span>
                  </div>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: colors.bg, color: colors.text, borderRadius: 9999 }}
                    >
                      {ABTEST_STATUS_LABELS[test.status]}
                    </span>
                  </div>
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <span style={{ color: '#9A9A9F', fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>
                      {new Date(test.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
