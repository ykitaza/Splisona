import crypto from "node:crypto";
import type { ProjectRepository } from "../domain/ports/project-repository.js";
import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import { toABTestDTO } from "../domain/types.js";
import type { Project } from "../domain/types.js";
import { NotFoundError } from "./errors.js";

export class ProjectUseCases {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly testRepo: ABTestRepository,
  ) {}

  async create(userId: string, input: { name: string; description?: string }): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      projectId: crypto.randomUUID(),
      userId,
      name: input.name,
      description: input.description ?? "",
      testIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.projectRepo.save(project);
    return project;
  }

  async list(userId: string): Promise<Project[]> {
    return this.projectRepo.findAllByUser(userId);
  }

  async get(userId: string, projectId: string): Promise<Project | undefined> {
    return this.projectRepo.findById(userId, projectId);
  }

  async update(userId: string, projectId: string, input: { name?: string; description?: string }): Promise<Project> {
    const existing = await this.projectRepo.findById(userId, projectId);
    if (!existing) throw new NotFoundError("Project");
    const updated: Project = {
      ...existing,
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      updatedAt: new Date().toISOString(),
    };
    await this.projectRepo.save(updated);
    return updated;
  }

  async delete(userId: string, projectId: string): Promise<void> {
    await this.projectRepo.remove(userId, projectId);
  }

  async addTest(userId: string, projectId: string, testId: string): Promise<Project> {
    const project = await this.projectRepo.findById(userId, projectId);
    if (!project) throw new NotFoundError("Project");
    if (project.testIds.includes(testId)) return project;
    const updated: Project = {
      ...project,
      testIds: [...project.testIds, testId],
      updatedAt: new Date().toISOString(),
    };
    await this.projectRepo.save(updated);
    return updated;
  }

  async removeTest(userId: string, projectId: string, testId: string): Promise<Project> {
    const project = await this.projectRepo.findById(userId, projectId);
    if (!project) throw new NotFoundError("Project");
    const updated: Project = {
      ...project,
      testIds: project.testIds.filter((id) => id !== testId),
      updatedAt: new Date().toISOString(),
    };
    await this.projectRepo.save(updated);
    return updated;
  }

  async getDetail(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(userId, projectId);
    if (!project) throw new NotFoundError("Project");
    const allTests = await this.testRepo.findAllByUser(userId);
    const tests = project.testIds
      .map((id) => allTests.find((t) => t.testId === id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map(toABTestDTO);
    return { project, tests };
  }
}
