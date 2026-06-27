import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { usePersonas } from '../hooks/usePersonas';
import { FlaskConical, Users, CalendarCheck, ArrowRight, Plus } from 'lucide-react';
import { ABTestTable } from '../components/ABTestTable';

export function DashboardPage() {
  const { tests, isLoading: testsLoading } = useABTests();
  const { personas } = usePersonas();
  const recentTests = useMemo(() => tests.slice(0, 10), [tests]);

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
          <ABTestTable
            tests={recentTests}
            mode="dashboard"
          />
        )}
      </div>
    </div>
  );
}
