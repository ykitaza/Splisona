import type { ShareLinkRepository, ShareLinkRecord } from "../../domain/ports/share-link-repository.js";
import type { D1Database } from "./d1-types.js";

interface ShareLinkRow {
  token_hash: string;
  test_id: string;
  user_id: string;
  prefix: string;
  created_at: string;
}

function toDomain(row: ShareLinkRow): ShareLinkRecord {
  return {
    testId: row.test_id,
    userId: row.user_id,
    prefix: row.prefix,
    createdAt: row.created_at,
  };
}

export class D1ShareLinkRepository implements ShareLinkRepository {
  constructor(private readonly db: D1Database) {}

  async findByHash(hash: string): Promise<ShareLinkRecord | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM share_links WHERE token_hash = ?")
      .bind(hash)
      .first<ShareLinkRow>();
    if (!row) return undefined;
    return toDomain(row);
  }

  async findByTest(userId: string, testId: string): Promise<ShareLinkRecord | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM share_links WHERE user_id = ? AND test_id = ?")
      .bind(userId, testId)
      .first<ShareLinkRow>();
    if (!row) return undefined;
    return toDomain(row);
  }

  async save(hash: string, record: ShareLinkRecord): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO share_links
        (token_hash, test_id, user_id, prefix, created_at)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(hash, record.testId, record.userId, record.prefix, record.createdAt)
      .run();
  }

  async removeByTest(userId: string, testId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM share_links WHERE user_id = ? AND test_id = ?")
      .bind(userId, testId)
      .run();
  }
}
