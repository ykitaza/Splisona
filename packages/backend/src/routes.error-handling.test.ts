import { Hono } from "hono";
import { describe, it, expect } from "vitest";
import { createContainer } from "./container.js";
import { createRoutes, type RouteEnv } from "./routes.js";
import type { PersonaRepository } from "./domain/ports/persona-repository.js";
import type { ABTestRepository } from "./domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "./domain/ports/evaluation-repository.js";
import type { SettingsRepository } from "./domain/ports/settings-repository.js";
import type { ProjectRepository } from "./domain/ports/project-repository.js";
import type { ApiKeyRepository, ApiKeyRecord } from "./domain/ports/api-key-repository.js";
import type { ShareLinkRepository, ShareLinkRecord } from "./domain/ports/share-link-repository.js";
import type { AIService, ConversationMessage, EvaluateDesignsParams, ImageSource } from "./domain/ports/ai-service.js";
import type { StorageService } from "./domain/ports/storage-service.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary, Persona, ABTest, SettingsRecord, Project } from "./domain/types.js";

// ルートのエラーハンドリング (onError 一本化 + 例外ルートの独自ステータス) を検証するための
// メモリ内リポジトリ。永続化は行わず、テストに必要な最小限の挙動のみ提供する。
class InMemoryPersonaRepository implements PersonaRepository {
  private store = new Map<string, Persona>();
  async findAllByUser(userId: string): Promise<Persona[]> {
    return [...this.store.values()].filter((p) => p.userId === userId);
  }
  async findById(userId: string, personaId: string): Promise<Persona | undefined> {
    const p = this.store.get(personaId);
    return p?.userId === userId ? p : undefined;
  }
  async save(persona: Persona): Promise<void> { this.store.set(persona.personaId, persona); }
  async saveAll(personas: Persona[]): Promise<void> { for (const p of personas) this.store.set(p.personaId, p); }
  async remove(userId: string, personaId: string): Promise<void> {
    const p = this.store.get(personaId);
    if (p?.userId === userId) this.store.delete(personaId);
  }
}

class InMemoryABTestRepository implements ABTestRepository {
  private store = new Map<string, ABTest>();
  async findAllByUser(userId: string): Promise<ABTest[]> {
    return [...this.store.values()].filter((t) => t.userId === userId);
  }
  async findById(userId: string, testId: string): Promise<ABTest | undefined> {
    const t = this.store.get(testId);
    return t?.userId === userId ? t : undefined;
  }
  async save(test: ABTest): Promise<void> { this.store.set(test.testId, test); }
  async updateFields(): Promise<void> {}
  async remove(userId: string, testId: string): Promise<void> {
    const t = this.store.get(testId);
    if (t?.userId === userId) this.store.delete(testId);
  }
}

class EmptyEvaluationRepository implements EvaluationRepository {
  async findAllByTest(_testId: string) { return []; }
  async save(_evaluation: never): Promise<void> {}
  async removeAllByTest(_testId: string): Promise<void> {}
}

class EmptySettingsRepository implements SettingsRepository {
  async findAllByUser(_userId: string): Promise<SettingsRecord[]> { return []; }
  async findBySection(_userId: string, _section: string): Promise<SettingsRecord | undefined> { return undefined; }
  async save(_userId: string, _record: SettingsRecord): Promise<void> {}
}

class EmptyProjectRepository implements ProjectRepository {
  async findAllByUser(_userId: string): Promise<Project[]> { return []; }
  async findById(_userId: string, _projectId: string): Promise<Project | undefined> { return undefined; }
  async save(_project: Project): Promise<void> {}
  async remove(_userId: string, _projectId: string): Promise<void> {}
}

class EmptyApiKeyRepository implements ApiKeyRepository {
  async findByHash(_hash: string): Promise<ApiKeyRecord | undefined> { return undefined; }
  async listByUser(_userId: string): Promise<ApiKeyRecord[]> { return []; }
  async save(_hash: string, _record: ApiKeyRecord): Promise<void> {}
  async remove(_userId: string, _keyId: string): Promise<void> {}
  async touchLastUsed(_hash: string, _iso: string): Promise<void> {}
}

class EmptyShareLinkRepository implements ShareLinkRepository {
  async findByHash(_hash: string): Promise<ShareLinkRecord | undefined> { return undefined; }
  async findByTest(_userId: string, _testId: string): Promise<ShareLinkRecord | undefined> { return undefined; }
  async save(_hash: string, _record: ShareLinkRecord): Promise<void> {}
  async removeByTest(_userId: string, _testId: string): Promise<void> {}
}

class StubAIService implements AIService {
  async generateDraft(): Promise<DraftResult> { throw new Error("not configured in test"); }
  async chat(_systemPrompt: string, _messages: ConversationMessage[]): Promise<string> { throw new Error("not configured in test"); }
  async evaluateDesigns(_params: EvaluateDesignsParams): Promise<EvaluationInput> { throw new Error("not configured in test"); }
  async summarizeReasons(): Promise<ReasonSummary> { throw new Error("not configured in test"); }
  async generateImprovementSuggestions(): Promise<ImprovementReport> { throw new Error("not configured in test"); }
  async generateTitle(_a: ImageSource, _b: ImageSource): Promise<string> { throw new Error("not configured in test"); }
}

class StubStorageService implements StorageService {
  async getUploadUrl(): Promise<never> { throw new Error("not configured in test"); }
  async putObject(): Promise<void> { throw new Error("not configured in test"); }
  getPreviewUrl(): string { throw new Error("not configured in test"); }
}

function buildTestApp() {
  const container = createContainer({
    personaRepo: new InMemoryPersonaRepository(),
    testRepo: new InMemoryABTestRepository(),
    evalRepo: new EmptyEvaluationRepository(),
    settingsRepo: new EmptySettingsRepository(),
    projectRepo: new EmptyProjectRepository(),
    apiKeyRepo: new EmptyApiKeyRepository(),
    shareRepo: new EmptyShareLinkRepository(),
    aiService: new StubAIService(),
    storageService: new StubStorageService(),
  });

  const app = new Hono<RouteEnv>();
  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("userId", "test-user");
    c.set("authVia", "session");
    await next();
  });
  app.route("/", createRoutes());
  return app;
}

describe("routes error handling (onError 一本化)", () => {
  it("存在しないペルソナの GET /personas/:id は404を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/personas/does-not-exist");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("displayNameなしの POST /personas は400を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("存在しないテストの GET /tests/:id/report は404を返す(onError経由)", async () => {
    const app = buildTestApp();
    const res = await app.request("/tests/does-not-exist/report");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });
});
