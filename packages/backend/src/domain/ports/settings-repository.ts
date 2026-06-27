import type { SettingsRecord } from "../types.js";

export interface SettingsRepository {
  findAllByUser(userId: string): Promise<SettingsRecord[]>;
  findBySection(userId: string, section: string): Promise<SettingsRecord | undefined>;
  save(userId: string, record: SettingsRecord): Promise<void>;
}
