import type { SettingsRepository } from "../domain/ports/settings-repository.js";

const VALID_SECTIONS = ["general", "figma", "model", "prompt"] as const;

export class SettingsUseCases {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  async getAll(userId: string): Promise<Record<string, unknown>> {
    const items = await this.settingsRepo.findAllByUser(userId);
    const result: Record<string, unknown> = {};
    for (const item of items) {
      result[item.section] = item.data;
    }
    return result;
  }

  async put(userId: string, section: string, data: unknown): Promise<void> {
    if (!(VALID_SECTIONS as readonly string[]).includes(section)) {
      throw new Error("invalid section");
    }
    await this.settingsRepo.save(userId, {
      section,
      data,
      updatedAt: new Date().toISOString(),
    });
  }

  async getAdditionalInstruction(userId: string, templateId: string): Promise<string> {
    const record = await this.settingsRepo.findBySection(userId, "prompt");
    const data = record?.data as Record<string, { additionalInstruction?: string }> | undefined;
    return data?.[templateId]?.additionalInstruction ?? "";
  }
}
