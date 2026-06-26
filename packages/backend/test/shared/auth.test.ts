import { describe, it, expect } from "vitest";
import { getUserId } from "../../src/shared/auth.js";

describe("getUserId", () => {
  it("JWT claims の sub を返す", () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: { sub: "cognito-user-id" },
          },
        },
      },
    };
    expect(getUserId(event)).toBe("cognito-user-id");
  });

  it("x-local-user-id ヘッダーにフォールバックする（ローカル開発用）", () => {
    const event = {
      headers: { "x-local-user-id": "local-user" },
    };
    expect(getUserId(event)).toBe("local-user");
  });

  it("JWT claims が x-local-user-id より優先される", () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: { sub: "jwt-user" },
          },
        },
      },
      headers: { "x-local-user-id": "local-user" },
    };
    expect(getUserId(event)).toBe("jwt-user");
  });

  it("userId が取得できない場合は Error をスローする", () => {
    expect(() => getUserId({})).toThrow("Unauthorized");
  });

  it("requestContext が undefined の場合は Error をスローする", () => {
    expect(() => getUserId({ requestContext: undefined })).toThrow("Unauthorized");
  });
});
