import { describe, it, expect } from "vitest";
import { createContainer } from "./container.js";
import { createLambdaApp } from "./lambda.js";
import type { PersonaRepository } from "./domain/ports/persona-repository.js";
import type { ABTestRepository } from "./domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "./domain/ports/evaluation-repository.js";
import type { SettingsRepository } from "./domain/ports/settings-repository.js";
import type { ProjectRepository } from "./domain/ports/project-repository.js";
import type { ApiKeyRepository, ApiKeyRecord } from "./domain/ports/api-key-repository.js";
import type { ShareLinkRepository, ShareLinkRecord } from "./domain/ports/share-link-repository.js";
import type { AIService, ConversationMessage, EvaluateDesignsParams, ImageSource } from "./domain/ports/ai-service.js";
import type { StorageService } from "./domain/ports/storage-service.js";
import type { DraftResult, EvaluationInput, ImprovementReport, ReasonSummary } from "./domain/types.js";

// テスト用: 何も永続化しないインメモリ実装（呼ばれない想定のメソッドは未使用エラーで気付けるようthrow）
function notConfigured<T extends object>(): T {
  return new Proxy({} as T, { get: () => () => { throw new Error("not configured in test"); } });
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

function buildTestContainer() {
  return createContainer({
    personaRepo: notConfigured<PersonaRepository>(),
    testRepo: notConfigured<ABTestRepository>(),
    evalRepo: notConfigured<EvaluationRepository>(),
    settingsRepo: notConfigured<SettingsRepository>(),
    projectRepo: notConfigured<ProjectRepository>(),
    apiKeyRepo: new EmptyApiKeyRepository(),
    shareRepo: new EmptyShareLinkRepository(),
    aiService: new StubAIService(),
    storageService: new StubStorageService(),
  });
}

function buildTestApp() {
  const container = buildTestContainer();
  return createLambdaApp(container, { shareTemplateKey: "templates/export-template.html" });
}

describe("lambda app", () => {
  it("GET /config は認証不要で200を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("modelId");
  });

  it("認証ヘッダなしの /personas は401を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/personas");
    expect(res.status).toBe(401);
  });

  it("無効なAPIキー(sk_...)での /personas は401を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/personas", {
      headers: { Authorization: "Bearer sk_invalid00000000000000000000000000000000000000000000000000" },
    });
    expect(res.status).toBe(401);
  });

  it("Cognito未設定時、Cognitoトークン想定のBearerも401を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/personas", {
      headers: { Authorization: "Bearer not-a-real-cognito-token" },
    });
    expect(res.status).toBe(401);
  });

  it("不正な共有トークンの /share/:token は404を返す", async () => {
    const app = buildTestApp();
    const res = await app.request("/share/shr_doesnotexist");
    expect(res.status).toBe(404);
  });
});
