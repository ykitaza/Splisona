import { apiRequest } from './client';
import type {
  ABTest,
  CreateABTestInput,
  UpdateABTestInput,
  UploadUrlRequest,
  UploadUrlResponse,
  ProgressResponse,
  ReportResponse,
} from '../types';

export function listTests(): Promise<ABTest[]> {
  return apiRequest('/tests');
}

export function getTest(id: string): Promise<ABTest> {
  return apiRequest(`/tests/${id}`);
}

export function createTest(input: CreateABTestInput): Promise<ABTest> {
  return apiRequest('/tests', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTest(id: string, input: UpdateABTestInput): Promise<ABTest> {
  return apiRequest(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function getUploadUrl(id: string, req: UploadUrlRequest): Promise<UploadUrlResponse> {
  return apiRequest(`/tests/${id}/upload-url`, { method: 'POST', body: JSON.stringify(req) });
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error('S3アップロード失敗');
}

export function executeTest(id: string): Promise<{ started: true }> {
  return apiRequest(`/tests/${id}/execute`, { method: 'POST' });
}

export function getProgress(id: string): Promise<ProgressResponse> {
  return apiRequest(`/tests/${id}/progress`);
}

export function getReport(id: string): Promise<ReportResponse> {
  return apiRequest(`/tests/${id}/report`);
}

export function exportTest(id: string): Promise<string> {
  return apiRequest(`/tests/${id}/export`);
}
