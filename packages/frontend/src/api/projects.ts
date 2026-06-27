import { apiRequest } from './client';
import type { Project, ProjectDetail } from '../types';

export function listProjects(): Promise<Project[]> {
  return apiRequest('/projects');
}

export function getProjectDetail(id: string): Promise<ProjectDetail> {
  return apiRequest(`/projects/${id}`);
}

export function createProject(input: { name: string; description?: string }): Promise<Project> {
  return apiRequest('/projects', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProject(id: string, input: { name?: string; description?: string }): Promise<Project> {
  return apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteProject(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/projects/${id}`, { method: 'DELETE' });
}

export function addTestToProject(projectId: string, testId: string): Promise<Project> {
  return apiRequest(`/projects/${projectId}/tests`, { method: 'POST', body: JSON.stringify({ testId }) });
}

export function removeTestFromProject(projectId: string, testId: string): Promise<Project> {
  return apiRequest(`/projects/${projectId}/tests/${testId}`, { method: 'DELETE' });
}
