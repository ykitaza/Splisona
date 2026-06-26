import { apiRequest } from './client';
import type { ABTest } from '../types';

export function listTests(): Promise<ABTest[]> {
  return apiRequest('/tests');
}
