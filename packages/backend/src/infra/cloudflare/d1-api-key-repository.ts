import type { ApiKeyRepository, ApiKeyRecord } from "../../domain/ports/api-key-repository.js";
import type { D1Database } from "./d1-types.js";

interface ApiKeyRow {
  key_hash: string;
  user_id: string;
  key_id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

function toDomain(row: ApiKeyRow): ApiKeyRecord {
  return {
    keyId: row.key_id,
    userId: row.user_id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export class D1ApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly db: D1Database) {}

  async findByHash(hash: string): Promise<ApiKeyRecord | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM api_keys WHERE key_hash = ?")
      .bind(hash)
      .first<ApiKeyRow>();
    if (!row) return undefined;
    return toDomain(row);
  }

  async listByUser(userId: string): Promise<ApiKeyRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM api_keys WHERE user_id = ?")
      .bind(userId)
      .all<ApiKeyRow>();
    return (result.results ?? []).map(toDomain);
  }

  async save(hash: string, record: ApiKeyRecord): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO api_keys
        (key_hash, user_id, key_id, name, prefix, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        hash, record.userId, record.keyId, record.name, record.prefix,
        record.createdAt, record.lastUsedAt ?? null,
      )
      .run();
  }

  async remove(userId: string, keyId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM api_keys WHERE user_id = ? AND key_id = ?")
      .bind(userId, keyId)
      .run();
  }

  async touchLastUsed(hash: string, iso: string): Promise<void> {
    await this.db
      .prepare("UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?")
      .bind(iso, hash)
      .run();
  }
}
