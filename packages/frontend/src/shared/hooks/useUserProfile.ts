import { useState, useEffect } from 'react';

interface UserProfile {
  name: string;
  email: string;
  initials: string;
}

const DEFAULT_PROFILE: UserProfile = { name: 'ユーザー', email: '', initials: 'U' };

function extractInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function useUserProfile(): UserProfile {
  const localUserId = import.meta.env?.VITE_LOCAL_USER_ID as string | undefined;
  const localName = import.meta.env?.VITE_LOCAL_USER_NAME as string | undefined;
  const localEmail = import.meta.env?.VITE_LOCAL_USER_EMAIL as string | undefined;
  const isCloudflare = !localUserId && !import.meta.env?.VITE_COGNITO_USER_POOL_ID;

  const [profile, setProfile] = useState<UserProfile>(() => {
    if (localUserId || isCloudflare) {
      const name = localName || localUserId || DEFAULT_PROFILE.name;
      return { name, email: localEmail || '', initials: extractInitials(name) };
    }
    return DEFAULT_PROFILE;
  });

  useEffect(() => {
    if (localUserId || isCloudflare) return;

    import('aws-amplify/auth').then(({ fetchUserAttributes }) =>
      fetchUserAttributes().then((attrs) => {
        const name = attrs.name || attrs.preferred_username || attrs.email?.split('@')[0] || DEFAULT_PROFILE.name;
        const email = attrs.email || '';
        setProfile({ name, email, initials: extractInitials(name) });
      }).catch(() => {})
    ).catch(() => {});
  }, [localUserId, isCloudflare]);

  return profile;
}
