import { describe, it, expect } from "vitest";
import { AppError, errorResponse, notFound, badRequest } from "../../src/shared/errors.js";

describe("AppError", () => {
  it("statusCode, code, message を保持する", () => {
    const err = new AppError(404, "NOT_FOUND", "Resource not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
    expect(err.name).toBe("AppError");
  });

  it("Error のインスタンスである", () => {
    const err = new AppError(500, "INTERNAL", "error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("errorResponse", () => {
  it("正しい statusCode・headers・body を返す", () => {
    const res = errorResponse(500, "INTERNAL_ERROR", "something went wrong");
    expect(res.statusCode).toBe(500);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(res.body);
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(body.message).toBe("something went wrong");
  });
});

describe("notFound", () => {
  it("404 AppError を返す", () => {
    const err = notFound("Persona");
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("Persona");
  });

  it("リソース名なしでも動作する", () => {
    const err = notFound();
    expect(err.statusCode).toBe(404);
  });
});

describe("badRequest", () => {
  it("400 レスポンスオブジェクトを返す", () => {
    const res = badRequest("displayName は必須です", ["displayName"]);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(body.fields).toContain("displayName");
  });

  it("fields なしでも動作する", () => {
    const res = badRequest("invalid input");
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.fields).toBeUndefined();
  });
});
