import type { ABTest } from '@/features/test/types';

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  testIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  project: Project;
  tests: ABTest[];
}
