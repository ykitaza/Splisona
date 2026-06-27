import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

vi.mock("../../src/container.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/container.js")>();
  return {
    ...orig,
    createContainer: (config?: unknown) => orig.createContainer(config as object),
  };
});

import { listPersonas, createPersona, getPersona, updatePersona, deletePersona } from "../../src/persona/handler.js";

function makeEvent(userId: string, pathParams: Record<string, string> = {}, body?: unknown) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: pathParams,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    requestContext: {},
  };
}

describe("Persona CRUD handlers", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  describe("createPersona", () => {
    it("returns 201 with persona when displayName is provided", async () => {
      const res = await createPersona(makeEvent("user-create", {}, { displayName: "テスト太郎", type: "consumer" }));
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.displayName).toBe("テスト太郎");
      expect(body.type).toBe("consumer");
      expect(body.personaId).toBeTruthy();
      expect(body.userId).toBe("user-create");
    });

    it("returns 400 when displayName is missing", async () => {
      const res = await createPersona(makeEvent("user-create", {}, { type: "consumer" }));
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("VALIDATION_ERROR");
      expect(body.fields).toContain("displayName");
    });

    it("returns 400 when displayName is blank", async () => {
      const res = await createPersona(makeEvent("user-create", {}, { displayName: "   ", type: "consumer" }));
      expect(res.statusCode).toBe(400);
    });
  });

  describe("listPersonas", () => {
    it("returns 200 with array of personas for the user", async () => {
      await createPersona(makeEvent("user-list", {}, { displayName: "一覧テスト", type: "business" }));
      const res = await listPersonas(makeEvent("user-list"));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.some((p: { displayName: string }) => p.displayName === "一覧テスト")).toBe(true);
    });

    it("returns only personas for the requesting user", async () => {
      await createPersona(makeEvent("user-iso-a", {}, { displayName: "Aのペルソナ", type: "other" }));
      await createPersona(makeEvent("user-iso-b", {}, { displayName: "Bのペルソナ", type: "other" }));

      const resA = await listPersonas(makeEvent("user-iso-a"));
      const bodyA = JSON.parse(resA.body);
      expect(bodyA.every((p: { userId: string }) => p.userId === "user-iso-a")).toBe(true);
    });
  });

  describe("getPersona", () => {
    it("returns 200 with persona when found", async () => {
      const createRes = await createPersona(makeEvent("user-get", {}, { displayName: "取得テスト", type: "expert" }));
      const created = JSON.parse(createRes.body);

      const res = await getPersona(makeEvent("user-get", { id: created.personaId }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.personaId).toBe(created.personaId);
      expect(body.displayName).toBe("取得テスト");
    });

    it("returns 404 for non-existent persona", async () => {
      const res = await getPersona(makeEvent("user-get", { id: "non-existent-id" }));
      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when accessing another user's persona", async () => {
      const createRes = await createPersona(makeEvent("owner-user", {}, { displayName: "オーナーのペルソナ", type: "other" }));
      const created = JSON.parse(createRes.body);

      const res = await getPersona(makeEvent("other-user", { id: created.personaId }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("updatePersona", () => {
    it("returns 200 with updated fields", async () => {
      const createRes = await createPersona(makeEvent("user-upd", {}, { displayName: "更新前", type: "consumer" }));
      const created = JSON.parse(createRes.body);

      const res = await updatePersona(makeEvent("user-upd", { id: created.personaId }, { displayName: "更新後", occupation: "エンジニア" }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.displayName).toBe("更新後");
      expect(body.occupation).toBe("エンジニア");
      expect(body.type).toBe("consumer");
    });

    it("returns 400 when displayName is updated to empty", async () => {
      const createRes = await createPersona(makeEvent("user-upd2", {}, { displayName: "有効な名前", type: "other" }));
      const created = JSON.parse(createRes.body);

      const res = await updatePersona(makeEvent("user-upd2", { id: created.personaId }, { displayName: "" }));
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 for non-existent persona", async () => {
      const res = await updatePersona(makeEvent("user-upd", { id: "non-existent" }, { displayName: "新しい名前" }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("deletePersona", () => {
    it("returns 200 with { deleted: true } and removes the item", async () => {
      const createRes = await createPersona(makeEvent("user-del", {}, { displayName: "削除対象", type: "youth" }));
      const created = JSON.parse(createRes.body);

      const delRes = await deletePersona(makeEvent("user-del", { id: created.personaId }));
      expect(delRes.statusCode).toBe(200);
      expect(JSON.parse(delRes.body).deleted).toBe(true);

      const getRes = await getPersona(makeEvent("user-del", { id: created.personaId }));
      expect(getRes.statusCode).toBe(404);
    });

    it("returns 404 for non-existent persona", async () => {
      const res = await deletePersona(makeEvent("user-del", { id: "non-existent-persona" }));
      expect(res.statusCode).toBe(404);
    });
  });
});
