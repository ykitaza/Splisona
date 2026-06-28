import type { ProjectRepository } from "../../domain/ports/project-repository.js";
import type { Project } from "../../domain/types.js";
import type { D1Database } from "./d1-types.js";

interface ProjectRow {
  project_id: string;
  user_id: string;
  name: string;
  description: string;
  test_ids: string;
  created_at: string;
  updated_at: string;
}

function toDomain(row: ProjectRow): Project {
  return {
    projectId: row.project_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    testIds: JSON.parse(row.test_ids) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class D1ProjectRepository implements ProjectRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByUser(userId: string): Promise<Project[]> {
    const result = await this.db
      .prepare("SELECT * FROM projects WHERE user_id = ?")
      .bind(userId)
      .all<ProjectRow>();
    return (result.results ?? []).map(toDomain);
  }

  async findById(userId: string, projectId: string): Promise<Project | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM projects WHERE user_id = ? AND project_id = ?")
      .bind(userId, projectId)
      .first<ProjectRow>();
    return row ? toDomain(row) : undefined;
  }

  async save(project: Project): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO projects
        (project_id, user_id, name, description, test_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        project.projectId, project.userId, project.name, project.description,
        JSON.stringify(project.testIds),
        project.createdAt, project.updatedAt,
      )
      .run();
  }

  async remove(userId: string, projectId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM projects WHERE user_id = ? AND project_id = ?")
      .bind(userId, projectId)
      .run();
  }
}
