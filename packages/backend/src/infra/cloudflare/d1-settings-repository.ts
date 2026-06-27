import type { SettingsRepository } from "../../domain/ports/settings-repository.js";
import type { SettingsRecord } from "../../domain/types.js";
import type { D1Database } from "./d1-types.js";

interface SettingsRow {
  user_id: string;
  section: string;
  data: string;
  updated_at: string | null;
}

export class D1SettingsRepository implements SettingsRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByUser(userId: string): Promise<SettingsRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM settings WHERE user_id = ?")
      .bind(userId)
      .all<SettingsRow>();
    return (result.results ?? []).map((row) => ({
      section: row.section,
      data: JSON.parse(row.data),
      updatedAt: row.updated_at ?? undefined,
    }));
  }

  async findBySection(userId: string, section: string): Promise<SettingsRecord | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM settings WHERE user_id = ? AND section = ?")
      .bind(userId, section)
      .first<SettingsRow>();
    if (!row) return undefined;
    return {
      section: row.section,
      data: JSON.parse(row.data),
      updatedAt: row.updated_at ?? undefined,
    };
  }

  async save(userId: string, record: SettingsRecord): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO settings (user_id, section, data, updated_at)
        VALUES (?, ?, ?, ?)`)
      .bind(userId, record.section, JSON.stringify(record.data), record.updatedAt ?? null)
      .run();
  }
}
