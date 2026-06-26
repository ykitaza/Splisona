import { apiRequest } from './client';

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
