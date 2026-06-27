import type { Project } from "../types.js";

export interface ProjectRepository {
  findAllByUser(userId: string): Promise<Project[]>;
  findById(userId: string, projectId: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  remove(userId: string, projectId: string): Promise<void>;
}
