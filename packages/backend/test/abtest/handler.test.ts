import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";

const { mockGetSignedUrl } = vi.hoisted(() => ({ mockGetSignedUrl: vi.fn() }));
vi.mock("../../src/shared/s3.js", () => ({
  s3Client: {},
  IMAGE_BUCKET: "test-bucket",
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  createTest,
  listTests,
  getTest,
  updateTest,
  getUploadUrl,
  getProgress,
} from "../../src/abtest/handler.js";

function makeEvent(userId: string, pathParams: Record<string, string> = {}, body?: unknown) {
  return {
    headers: { "x-local-user-id": userId },
    pathParameters: pathParams,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    requestContext: {},
  };
}

describe("ABTest CRUD handlers", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  describe("createTest", () => {
    it("returns 201 with testId and draft status", async () => {
      const res = await createTest(makeEvent("user-ab", {}, { title: "テストA/B" }));
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.testId).toBeTruthy();
      expect(body.title).toBe("テストA/B");
      expect(body.status).toBe("draft");
      expect(body.userId).toBe("user-ab");
    });

    it("returns 400 when title is missing", async () => {
      const res = await createTest(makeEvent("user-ab", {}, {}));
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when title is blank", async () => {
      const res = await createTest(makeEvent("user-ab", {}, { title: "   " }));
      expect(res.statusCode).toBe(400);
    });
  });

  describe("listTests", () => {
    it("returns 200 with array of tests for the user", async () => {
      await createTest(makeEvent("user-list-ab", {}, { title: "一覧テスト" }));
      const res = await listTests(makeEvent("user-list-ab"));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.some((t: { title: string }) => t.title === "一覧テスト")).toBe(true);
    });

    it("returns only tests for the requesting user", async () => {
      await createTest(makeEvent("user-ab-iso-a", {}, { title: "Aのテスト" }));
      await createTest(makeEvent("user-ab-iso-b", {}, { title: "Bのテスト" }));
      const res = await listTests(makeEvent("user-ab-iso-a"));
      const body = JSON.parse(res.body);
      expect(body.every((t: { userId: string }) => t.userId === "user-ab-iso-a")).toBe(true);
    });
  });

  describe("getTest", () => {
    it("returns 200 with test when found", async () => {
      const createRes = await createTest(makeEvent("user-get-ab", {}, { title: "取得テスト" }));
      const created = JSON.parse(createRes.body);
      const res = await getTest(makeEvent("user-get-ab", { id: created.testId }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.testId).toBe(created.testId);
    });

    it("returns 404 for non-existent test", async () => {
      const res = await getTest(makeEvent("user-get-ab", { id: "non-existent" }));
      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when accessing another user's test", async () => {
      const createRes = await createTest(makeEvent("owner-ab", {}, { title: "オーナーテスト" }));
      const created = JSON.parse(createRes.body);
      const res = await getTest(makeEvent("other-ab", { id: created.testId }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("updateTest", () => {
    it("returns 200 with updated personaIds", async () => {
      const createRes = await createTest(makeEvent("user-upd-ab", {}, { title: "更新テスト" }));
      const created = JSON.parse(createRes.body);

      const res = await updateTest(makeEvent("user-upd-ab", { id: created.testId }, {
        personaIds: ["persona-1", "persona-2"],
      }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.personaIds).toEqual(["persona-1", "persona-2"]);
    });

    it("returns 404 for non-existent test", async () => {
      const res = await updateTest(makeEvent("user-upd-ab", { id: "non-existent" }, { title: "新タイトル" }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("getUploadUrl", () => {
    it("returns 200 with uploadUrl and imageKey for side A", async () => {
      const createRes = await createTest(makeEvent("user-url-ab", {}, { title: "URLテスト" }));
      const created = JSON.parse(createRes.body);

      mockGetSignedUrl.mockResolvedValueOnce("https://s3.example.com/presigned-url");

      const res = await getUploadUrl(makeEvent("user-url-ab", { id: created.testId }, {
        side: "A",
        contentType: "image/png",
      }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.uploadUrl).toBe("https://s3.example.com/presigned-url");
      expect(body.imageKey).toContain(created.testId);
      expect(body.imageKey).toContain("A");
    });

    it("returns 404 when test not found", async () => {
      const res = await getUploadUrl(makeEvent("user-url-ab", { id: "non-existent" }, {
        side: "A",
        contentType: "image/png",
      }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe("getProgress", () => {
    it("returns 200 with progress info", async () => {
      const createRes = await createTest(makeEvent("user-prog-ab", {}, { title: "進捗テスト" }));
      const created = JSON.parse(createRes.body);

      const res = await getProgress(makeEvent("user-prog-ab", { id: created.testId }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(typeof body.total).toBe("number");
      expect(typeof body.completed).toBe("number");
      expect(typeof body.failed).toBe("number");
      expect(body.status).toBe("draft");
    });

    it("returns 404 for non-existent test", async () => {
      const res = await getProgress(makeEvent("user-prog-ab", { id: "non-existent" }));
      expect(res.statusCode).toBe(404);
    });
  });
});
