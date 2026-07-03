import type { ShareLinkRepository, ShareLinkRecord } from "../../domain/ports/share-link-repository.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface ShareLinkMetaRecord {
  PK: string;
  SK: string;
  testId: string;
  userId: string;
  prefix: string;
  createdAt: string;
}

interface ShareLinkTestRecord {
  PK: string;
  SK: string;
  hash: string;
  prefix: string;
  createdAt: string;
}

function metaKey(hash: string) {
  return { PK: `SHARE#${hash}`, SK: "META" };
}

function testKey(userId: string, testId: string) {
  return { PK: `USER#${userId}`, SK: `SHARELINK#${testId}` };
}

function toDomain(r: ShareLinkMetaRecord): ShareLinkRecord {
  return {
    testId: r.testId,
    userId: r.userId,
    prefix: r.prefix,
    createdAt: r.createdAt,
  };
}

export class DynamoShareLinkRepository implements ShareLinkRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findByHash(hash: string): Promise<ShareLinkRecord | undefined> {
    const item = await this.db.getItem<ShareLinkMetaRecord>(metaKey(hash));
    return item ? toDomain(item) : undefined;
  }

  async findByTest(userId: string, testId: string): Promise<ShareLinkRecord | undefined> {
    const item = await this.db.getItem<ShareLinkTestRecord>(testKey(userId, testId));
    if (!item) return undefined;
    return { testId, userId, prefix: item.prefix, createdAt: item.createdAt };
  }

  async save(hash: string, record: ShareLinkRecord): Promise<void> {
    const meta: ShareLinkMetaRecord = {
      ...metaKey(hash),
      testId: record.testId,
      userId: record.userId,
      prefix: record.prefix,
      createdAt: record.createdAt,
    };
    const test: ShareLinkTestRecord = {
      ...testKey(record.userId, record.testId),
      hash,
      prefix: record.prefix,
      createdAt: record.createdAt,
    };
    await Promise.all([
      this.db.putItem(meta as unknown as Record<string, unknown>),
      this.db.putItem(test as unknown as Record<string, unknown>),
    ]);
  }

  async removeByTest(userId: string, testId: string): Promise<void> {
    const test = await this.db.getItem<ShareLinkTestRecord>(testKey(userId, testId));
    if (!test) return;
    await Promise.all([
      this.db.deleteItem(testKey(userId, testId)),
      this.db.deleteItem(metaKey(test.hash)),
    ]);
  }
}
