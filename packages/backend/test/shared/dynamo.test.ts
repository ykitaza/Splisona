import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestTable, deleteTestTable } from "../helpers/dynamo.js";
import { personaKey, abtestKey, evaluationKey, userKey, putItem, getItem, queryByPK, deleteItem } from "../../src/shared/dynamo.js";
import type { PersonaRecord } from "../../src/shared/types.js";

describe("dynamo key helpers", () => {
  it("userKey builds correct PK/SK", () => {
    expect(userKey("abc")).toEqual({ PK: "USER#abc", SK: "USER#abc" });
  });

  it("personaKey builds correct PK/SK", () => {
    expect(personaKey("u1", "p1")).toEqual({ PK: "USER#u1", SK: "PERSONA#p1" });
  });

  it("abtestKey builds correct PK/SK", () => {
    expect(abtestKey("u1", "t1")).toEqual({ PK: "USER#u1", SK: "ABTEST#t1" });
  });

  it("evaluationKey builds correct PK/SK", () => {
    expect(evaluationKey("t1", "p1")).toEqual({ PK: "ABTEST#t1", SK: "EVAL#p1" });
  });
});

describe("DynamoDB Local integration", () => {
  beforeAll(async () => {
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
  });

  it("putItem and getItem round-trips a persona record", async () => {
    const record: PersonaRecord = {
      PK: "USER#test-user",
      SK: "PERSONA#test-persona-1",
      displayName: "テストユーザー",
      type: "consumer",
      createdAt: "2026-06-25T00:00:00Z",
      updatedAt: "2026-06-25T00:00:00Z",
    };

    await putItem(record as unknown as Record<string, unknown>);

    const fetched = await getItem<PersonaRecord>({ PK: "USER#test-user", SK: "PERSONA#test-persona-1" });
    expect(fetched?.displayName).toBe("テストユーザー");
    expect(fetched?.type).toBe("consumer");
  });

  it("queryByPK returns items matching PK and SK prefix", async () => {
    await putItem({
      PK: "USER#test-user",
      SK: "PERSONA#test-persona-2",
      displayName: "二番目",
      type: "business",
      createdAt: "2026-06-25T00:00:00Z",
      updatedAt: "2026-06-25T00:00:00Z",
    });

    const results = await queryByPK<PersonaRecord>("USER#test-user", "PERSONA#");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((r) => r.SK.startsWith("PERSONA#"))).toBe(true);
  });

  it("deleteItem removes the record", async () => {
    await putItem({ PK: "USER#test-user", SK: "PERSONA#to-delete", displayName: "削除対象", type: "other", createdAt: "", updatedAt: "" });

    await deleteItem({ PK: "USER#test-user", SK: "PERSONA#to-delete" });

    const fetched = await getItem({ PK: "USER#test-user", SK: "PERSONA#to-delete" });
    expect(fetched).toBeUndefined();
  });
});
