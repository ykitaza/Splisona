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

import { createPersona } from "../../src/persona/handler.js";
import { interviewPersona } from "../../src/interview/handler.js";

function makeEvent(userId: string, pathParams: Record<string, string> = {}, body?: unknown) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: pathParams,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    requestContext: {},
  };
}

describe("interviewPersona", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  it("returns 200 with content on successful interview", async () => {
    const createRes = await createPersona(makeEvent("user-interview", {}, { displayName: "インタビュー太郎", type: "consumer", occupation: "エンジニア" }));
    const persona = JSON.parse(createRes.body);

    mockAIService.chat.mockResolvedValueOnce("こんにちは！私はエンジニアです。");

    const res = await interviewPersona(makeEvent("user-interview", { id: persona.personaId }, {
      messages: [{ role: "user", content: "自己紹介してください" }],
    }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.content).toBe("こんにちは！私はエンジニアです。");
  });

  it("returns 404 when persona not found", async () => {
    const res = await interviewPersona(makeEvent("user-interview", { id: "non-existent" }, {
      messages: [{ role: "user", content: "質問" }],
    }));
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when accessing another user's persona", async () => {
    const createRes = await createPersona(makeEvent("owner-interview", {}, { displayName: "オーナー", type: "other" }));
    const persona = JSON.parse(createRes.body);

    const res = await interviewPersona(makeEvent("other-interview", { id: persona.personaId }, {
      messages: [],
    }));
    expect(res.statusCode).toBe(404);
  });

  it("returns 503 when Bedrock call fails", async () => {
    const createRes = await createPersona(makeEvent("user-interview-fail", {}, { displayName: "失敗テスト", type: "other" }));
    const persona = JSON.parse(createRes.body);

    mockAIService.chat.mockRejectedValueOnce(new Error("Bedrock throttled"));

    const res = await interviewPersona(makeEvent("user-interview-fail", { id: persona.personaId }, {
      messages: [{ role: "user", content: "質問" }],
    }));
    expect(res.statusCode).toBe(503);
  });
});
