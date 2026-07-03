import type { ProjectRepository } from "../../domain/ports/project-repository.js";
import type { Project } from "../../domain/types.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface ProjectDynamoRecord {
  PK: string;
  SK: string;
  name: string;
  description: string;
  testIds: string[];
  createdAt: string;
  updatedAt: string;
}

function toKey(userId: string, projectId: string) {
  return { PK: `USER#${userId}`, SK: `PROJECT#${projectId}` };
}

function toDomain(r: ProjectDynamoRecord): Project {
  return {
    projectId: r.SK.replace("PROJECT#", ""),
    userId: r.PK.replace("USER#", ""),
    name: r.name,
    description: r.description,
    testIds: r.testIds,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toRecord(p: Project): ProjectDynamoRecord {
  return {
    ...toKey(p.userId, p.projectId),
    name: p.name,
    description: p.description,
    testIds: p.testIds,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class DynamoProjectRepository implements ProjectRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findAllByUser(userId: string): Promise<Project[]> {
    const items = await this.db.queryByPK<ProjectDynamoRecord>(`USER#${userId}`, "PROJECT#");
    return items.map(toDomain);
  }

  async findById(userId: string, projectId: string): Promise<Project | undefined> {
    const item = await this.db.getItem<ProjectDynamoRecord>(toKey(userId, projectId));
    return item ? toDomain(item) : undefined;
  }

  async save(project: Project): Promise<void> {
    await this.db.putItem(toRecord(project) as unknown as Record<string, unknown>);
  }

  async remove(userId: string, projectId: string): Promise<void> {
    await this.db.deleteItem(toKey(userId, projectId));
  }
}
