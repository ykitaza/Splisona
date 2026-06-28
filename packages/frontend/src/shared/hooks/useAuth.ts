import { useState, useEffect } from 'react';

export function useAuth() {
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  const isCloudflare = !localUserId && !import.meta.env?.VITE_COGNITO_USER_POOL_ID;

  const [isAuthenticated, setIsAuthenticated] = useState(!!localUserId || isCloudflare);
  const [isLoading, setIsLoading] = useState(!localUserId && !isCloudflare);

  useEffect(() => {
    if (localUserId || isCloudflare) return;

    import('aws-amplify/auth').then(({ fetchAuthSession }) =>
      fetchAuthSession()
        .then((session) => setIsAuthenticated(!!session.tokens))
        .catch(() => setIsAuthenticated(false))
        .finally(() => setIsLoading(false))
    ).catch(() => {
      setIsAuthenticated(false);
      setIsLoading(false);
    });
  }, [localUserId, isCloudflare]);

  return { isAuthenticated, isLoading };
}
