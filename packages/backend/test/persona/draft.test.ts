import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const mockAIService = {
  generateDraft: vi.fn(),
  chat: vi.fn(),
  evaluateDesigns: vi.fn(),
  summarizeReasons: vi.fn(),
};

vi.mock("../../src/container.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/container.js")>();
  return {
    ...orig,
    createContainer: (config?: unknown) => orig.createContainer({
      ...(config as object),
      aiService: mockAIService,
    }),
  };
});

import { createPersona, generateDraft } from "../../src/persona/handler.js";

function makeEvent(userId: string, pathParams: Record<string, string> = {}, body?: unknown) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: pathParams,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    requestContext: {},
  };
}

describe("generateDraft", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  it("returns 200 with freeText and suggestedDescription on success", async () => {
    const createRes = await createPersona(makeEvent("user-draft", {}, { displayName: "ドラフトテスト", type: "consumer" }));
    const persona = JSON.parse(createRes.body);

    mockAIService.generateDraft.mockResolvedValueOnce({
      freeText: "テスト自由記述テキスト",
      suggestedDescription: "テスト推奨説明",
    });

    const res = await generateDraft(makeEvent("user-draft", { id: persona.personaId }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.freeText).toBe("テスト自由記述テキスト");
    expect(body.suggestedDescription).toBe("テスト推奨説明");
  });

  it("returns 404 when persona not found", async () => {
    const res = await generateDraft(makeEvent("user-draft", { id: "non-existent-persona" }));
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when accessing another user's persona", async () => {
    const createRes = await createPersona(makeEvent("owner-draft", {}, { displayName: "オーナーペルソナ", type: "other" }));
    const persona = JSON.parse(createRes.body);

    const res = await generateDraft(makeEvent("other-draft", { id: persona.personaId }));
    expect(res.statusCode).toBe(404);
  });

  it("returns 503 when Bedrock call fails", async () => {
    const createRes = await createPersona(makeEvent("user-draft-503", {}, { displayName: "503テスト", type: "other" }));
    const persona = JSON.parse(createRes.body);

    mockAIService.generateDraft.mockRejectedValueOnce(new Error("Bedrock service unavailable"));

    const res = await generateDraft(makeEvent("user-draft-503", { id: persona.personaId }));
    expect(res.statusCode).toBe(503);
  });
});
