import { Link, useNavigate } from 'react-router-dom';
import { useABTests } from '../hooks/useABTests';
import { ABTEST_STATUS_LABELS, type ABTestStatus } from '../types';

const STATUS_COLORS: Record<ABTestStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function DashboardPage() {
  const { tests, isLoading } = useABTests();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  function handleTestClick(testId: string, status: ABTestStatus) {
    if (status === 'running') {
      navigate(`/tests/${testId}/running`);
    } else {
      navigate(`/tests/${testId}/report`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <Link
          to="/tests/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          テスト作成
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">テストがありません</p>
          <Link
            to="/tests/new"
            className="text-indigo-600 font-medium hover:underline"
          >
            テストを作成する
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {tests.map((test) => (
            <li key={test.testId}>
              <button
                onClick={() => handleTestClick(test.testId, test.status)}
                className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{test.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[test.status]}`}
                  >
                    {ABTEST_STATUS_LABELS[test.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(test.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
