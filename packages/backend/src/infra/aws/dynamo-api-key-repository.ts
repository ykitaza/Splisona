import type { ApiKeyRepository, ApiKeyRecord } from "../../domain/ports/api-key-repository.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface ApiKeyMetaRecord {
  PK: string;
  SK: string;
  userId: string;
  keyId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface ApiKeyListRecord {
  PK: string;
  SK: string;
  hash: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

function metaKey(hash: string) {
  return { PK: `APIKEY#${hash}`, SK: "META" };
}

function listKey(userId: string, keyId: string) {
  return { PK: `USER#${userId}`, SK: `APIKEY#${keyId}` };
}

function toDomain(r: ApiKeyMetaRecord): ApiKeyRecord {
  return {
    keyId: r.keyId,
    userId: r.userId,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  };
}

export class DynamoApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findByHash(hash: string): Promise<ApiKeyRecord | undefined> {
    const item = await this.db.getItem<ApiKeyMetaRecord>(metaKey(hash));
    return item ? toDomain(item) : undefined;
  }

  async listByUser(userId: string): Promise<ApiKeyRecord[]> {
    const items = await this.db.queryByPK<ApiKeyListRecord>(`USER#${userId}`, "APIKEY#");
    return items.map((r) => ({
      keyId: r.SK.replace("APIKEY#", ""),
      userId,
      name: r.name,
      prefix: r.prefix,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
    }));
  }

  async save(hash: string, record: ApiKeyRecord): Promise<void> {
    const meta: ApiKeyMetaRecord = {
      ...metaKey(hash),
      userId: record.userId,
      keyId: record.keyId,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    };
    const list: ApiKeyListRecord = {
      ...listKey(record.userId, record.keyId),
      hash,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    };
    await Promise.all([
      this.db.putItem(meta as unknown as Record<string, unknown>),
      this.db.putItem(list as unknown as Record<string, unknown>),
    ]);
  }

  async remove(userId: string, keyId: string): Promise<void> {
    const list = await this.db.getItem<ApiKeyListRecord>(listKey(userId, keyId));
    if (!list) return;
    await Promise.all([
      this.db.deleteItem(listKey(userId, keyId)),
      this.db.deleteItem(metaKey(list.hash)),
    ]);
  }

  async touchLastUsed(hash: string, iso: string): Promise<void> {
    const meta = await this.db.getItem<ApiKeyMetaRecord>(metaKey(hash));
    if (!meta) throw new Error(`ApiKey not found for hash: ${hash}`);
    const list = await this.db.getItem<ApiKeyListRecord>(listKey(meta.userId, meta.keyId));
    if (!list) throw new Error(`ApiKey list entry not found for user ${meta.userId} keyId ${meta.keyId}`);
    await Promise.all([
      this.db.putItem({ ...meta, lastUsedAt: iso } as unknown as Record<string, unknown>),
      this.db.putItem({ ...list, lastUsedAt: iso } as unknown as Record<string, unknown>),
    ]);
  }
}
