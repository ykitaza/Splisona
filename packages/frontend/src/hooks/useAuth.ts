import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return { isAuthenticated, isLoading };
}
