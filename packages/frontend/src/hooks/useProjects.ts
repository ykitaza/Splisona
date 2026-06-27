import { useState, useEffect, useCallback } from 'react';
import { listProjects, deleteProject as apiDeleteProject } from '../api/projects';
import type { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '読み込み失敗'))
      .finally(() => setIsLoading(false));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await apiDeleteProject(id);
    setProjects((prev) => prev.filter((p) => p.projectId !== id));
  }, []);

  const refresh = useCallback(() => {
    listProjects().then(setProjects).catch(() => {});
  }, []);

  return { projects, isLoading, error, deleteProject, refresh };
}
