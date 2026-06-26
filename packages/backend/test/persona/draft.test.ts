import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const { mockBedrockSend } = vi.hoisted(() => ({ mockBedrockSend: vi.fn() }));
vi.mock("../../src/shared/bedrock.js", () => ({
  bedrockClient: { send: mockBedrockSend },
  MODEL_ID: "amazon.nova-lite-v1:0",
}));

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

    mockBedrockSend.mockResolvedValueOnce({
      output: {
        message: {
          content: [
            {
              toolUse: {
                name: "generate_draft",
                input: {
                  freeText: "テスト自由記述テキスト",
                  suggestedDescription: "テスト推奨説明",
                },
              },
            },
          ],
        },
      },
      stopReason: "tool_use",
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

    mockBedrockSend.mockRejectedValueOnce(new Error("Bedrock service unavailable"));

    const res = await generateDraft(makeEvent("user-draft-503", { id: persona.personaId }));
    expect(res.statusCode).toBe(503);
  });
});
