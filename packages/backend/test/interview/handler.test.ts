import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const { mockBedrockSend } = vi.hoisted(() => ({ mockBedrockSend: vi.fn() }));
vi.mock("../../src/shared/bedrock.js", () => ({
  bedrockClient: { send: mockBedrockSend },
  MODEL_ID: "amazon.nova-lite-v1:0",
}));

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

    mockBedrockSend.mockResolvedValueOnce({
      output: {
        message: {
          role: "assistant",
          content: [{ text: "こんにちは！私はエンジニアです。" }],
        },
      },
      stopReason: "end_turn",
    });

    const res = await interviewPersona(makeEvent("user-interview", { id: persona.personaId }, {
      messages: [{ role: "user", content: "自己紹介してください" }],
    }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.content).toBe("こんにちは！私はエンジニアです。");
  });

  it("returns 200 with concatenated content when multiple text blocks", async () => {
    const createRes = await createPersona(makeEvent("user-interview-multi", {}, { displayName: "マルチブロック", type: "expert" }));
    const persona = JSON.parse(createRes.body);

    mockBedrockSend.mockResolvedValueOnce({
      output: {
        message: {
          role: "assistant",
          content: [{ text: "前半のテキスト。" }, { text: "後半のテキスト。" }],
        },
      },
      stopReason: "end_turn",
    });

    const res = await interviewPersona(makeEvent("user-interview-multi", { id: persona.personaId }, {
      messages: [{ role: "user", content: "質問" }],
    }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.content).toBe("前半のテキスト。後半のテキスト。");
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

    mockBedrockSend.mockRejectedValueOnce(new Error("Bedrock throttled"));

    const res = await interviewPersona(makeEvent("user-interview-fail", { id: persona.personaId }, {
      messages: [{ role: "user", content: "質問" }],
    }));
    expect(res.statusCode).toBe(503);
  });
});
