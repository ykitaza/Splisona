import type { SettingsRepository } from "../../domain/ports/settings-repository.js";
import type { SettingsRecord } from "../../domain/types.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface SettingsDynamoRecord {
  PK: string;
  SK: string;
  data: unknown;
  updatedAt?: string;
}

function toKey(userId: string, section: string) {
  return { PK: `USER#${userId}`, SK: `SETTINGS#${section}` };
}

export class DynamoSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findAllByUser(userId: string): Promise<SettingsRecord[]> {
    const items = await this.db.queryByPK<SettingsDynamoRecord>(`USER#${userId}`, "SETTINGS#");
    return items.map((item) => ({
      section: item.SK.replace("SETTINGS#", ""),
      data: item.data,
      updatedAt: item.updatedAt,
    }));
  }

  async findBySection(userId: string, section: string): Promise<SettingsRecord | undefined> {
    const item = await this.db.getItem<SettingsDynamoRecord>(toKey(userId, section));
    if (!item) return undefined;
    return {
      section: item.SK.replace("SETTINGS#", ""),
      data: item.data,
      updatedAt: item.updatedAt,
    };
  }

  async save(userId: string, record: SettingsRecord): Promise<void> {
    await this.db.putItem({
      ...toKey(userId, record.section),
      data: record.data,
      updatedAt: record.updatedAt,
    });
  }
}
