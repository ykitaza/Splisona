import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

vi.mock("../../src/container.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/container.js")>();
  return {
    ...orig,
    createContainer: (config?: unknown) => orig.createContainer(config as object),
  };
});

import { getSettings, putSettings } from "../../src/settings/handler.js";

function makeEvent(userId: string, body?: string) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: {},
    body: body ?? null,
    requestContext: {},
  };
}

describe("Settings handler", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  describe("getSettings", () => {
    it("設定がない場合は空オブジェクトを返す", async () => {
      const res = await getSettings(makeEvent("user-settings-1"));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toEqual({});
    });
  });

  describe("putSettings", () => {
    it("figma セクションを保存・取得できる", async () => {
      const userId = "user-settings-2";
      const putRes = await putSettings(
        makeEvent(userId, JSON.stringify({ section: "figma", data: { token: "fig-123", email: "test@test.com" } }))
      );
      expect(putRes.statusCode).toBe(200);

      const getRes = await getSettings(makeEvent(userId));
      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.figma).toEqual({ token: "fig-123", email: "test@test.com" });
    });

    it("model セクションを保存・取得できる", async () => {
      const userId = "user-settings-3";
      const putRes = await putSettings(
        makeEvent(userId, JSON.stringify({ section: "model", data: { modelId: "claude-sonnet" } }))
      );
      expect(putRes.statusCode).toBe(200);

      const getRes = await getSettings(makeEvent(userId));
      const body = JSON.parse(getRes.body);
      expect(body.model).toEqual({ modelId: "claude-sonnet" });
    });

    it("不正な section は 400 を返す", async () => {
      const res = await putSettings(
        makeEvent("user-settings-4", JSON.stringify({ section: "invalid", data: {} }))
      );
      expect(res.statusCode).toBe(400);
    });

    it("body が空の場合は 400 を返す", async () => {
      const res = await putSettings(makeEvent("user-settings-5"));
      expect(res.statusCode).toBe(400);
    });
  });
});
