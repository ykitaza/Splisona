import { useState, useEffect } from 'react';
import { listTests } from '../api/tests';
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

  return { tests, isLoading, error };
}
