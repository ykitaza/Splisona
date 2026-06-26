import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useAuth() {
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  const [isAuthenticated, setIsAuthenticated] = useState(!!localUserId);
  const [isLoading, setIsLoading] = useState(!localUserId);

  useEffect(() => {
    if (localUserId) return;

    fetchAuthSession()
      .then((session) => {
        setIsAuthenticated(!!session.tokens);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [localUserId]);

  return { isAuthenticated, isLoading };
}
