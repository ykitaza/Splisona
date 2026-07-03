import { apiRequest } from '@/shared/api/client';

export type SettingsSection = 'general' | 'figma' | 'model' | 'prompt';

export async function getSettings(): Promise<Record<string, unknown>> {
  return apiRequest('/settings');
}

export async function putSettings(section: SettingsSection, data: unknown): Promise<void> {
  await apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify({ section, data }),
  });
}

export interface AppConfig {
  modelId: string;
}

export async function getConfig(): Promise<AppConfig> {
  return apiRequest('/config');
}

export interface ApiKeyRecord {
  keyId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyResponse extends ApiKeyRecord {
  plainKey: string;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  return apiRequest('/agent/keys');
}

export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  return apiRequest('/agent/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(keyId: string): Promise<{ deleted: true }> {
  return apiRequest(`/agent/keys/${keyId}`, { method: 'DELETE' });
}
