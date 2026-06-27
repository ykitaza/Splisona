import { useState, useEffect, useCallback } from 'react';
import { listTests, deleteTest as apiDeleteTest } from '../api/tests';
import type { ABTest } from '../types';

export function useABTests() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTests()
      .then(setTests)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '読み込み失敗'))
      .finally(() => setIsLoading(false));
  }, []);

  const deleteTest = useCallback(async (id: string) => {
    await apiDeleteTest(id);
    setTests((prev) => prev.filter((t) => t.testId !== id));
  }, []);

  const deleteTests = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(apiDeleteTest));
    setTests((prev) => prev.filter((t) => !ids.includes(t.testId)));
  }, []);

  const refresh = useCallback(() => {
    listTests().then(setTests);
  }, []);

  return { tests, isLoading, error, deleteTest, deleteTests, refresh };
}
