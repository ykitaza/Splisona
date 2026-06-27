import crypto from "node:crypto";
import type { PersonaRepository } from "../domain/ports/persona-repository.js";
import type { SettingsRepository } from "../domain/ports/settings-repository.js";
import type { AIService } from "../domain/ports/ai-service.js";
import type { StorageService } from "../domain/ports/storage-service.js";
import { personaTypeLabel } from "../domain/types.js";
import type { Persona, DraftResult, UploadUrlResult } from "../domain/types.js";
import { buildDefaultPersonas } from "../domain/default-personas.js";
import { NotFoundError, ForbiddenError } from "./errors.js";

export { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "./errors.js";

export class PersonaUseCases {
  constructor(
    private readonly personaRepo: PersonaRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly aiService: AIService,
    private readonly storageService: StorageService,
  ) {}

  async list(userId: string): Promise<Persona[]> {
    let items = await this.personaRepo.findAllByUser(userId);
    if (!items.some((p) => p.source === "default")) {
      const now = new Date().toISOString();
      const defaults = buildDefaultPersonas(userId, now);
      await this.personaRepo.saveAll(defaults);
      items = [...defaults, ...items];
    }
    return items;
  }

  async get(userId: string, personaId: string): Promise<Persona | undefined> {
    return this.personaRepo.findById(userId, personaId);
  }

  async create(userId: string, input: Partial<Persona> & { displayName: string }): Promise<Persona> {
    const personaId = crypto.randomUUID();
    const now = new Date().toISOString();
    const persona: Persona = {
      personaId,
      userId,
      displayName: input.displayName,
      type: input.type ?? "other",
      source: input.source,
      age: input.age,
      gender: input.gender,
      occupation: input.occupation,
      deviationScore: input.deviationScore,
      annualIncome: input.annualIncome,
      education: input.education,
      freeText: input.freeText,
      createdAt: now,
      updatedAt: now,
    };
    await this.personaRepo.save(persona);
    return persona;
  }

  async update(userId: string, personaId: string, input: Partial<Persona>): Promise<Persona> {
    const existing = await this.personaRepo.findById(userId, personaId);
    if (!existing) throw new NotFoundError("Persona");
    if (existing.source === "default") throw new ForbiddenError("デフォルトペルソナは編集できません");

    const now = new Date().toISOString();
    const updated: Persona = {
      ...existing,
      ...Object.fromEntries(
        Object.entries({
          displayName: input.displayName,
          type: input.type,
          age: input.age,
          gender: input.gender,
          occupation: input.occupation,
          deviationScore: input.deviationScore,
          annualIncome: input.annualIncome,
          education: input.education,
          freeText: input.freeText,
          source: input.source,
          avatarImageKey: input.avatarImageKey,
        }).filter(([, v]) => v !== undefined)
      ),
      updatedAt: now,
    };
    await this.personaRepo.save(updated);
    return updated;
  }

  async delete(userId: string, personaId: string): Promise<void> {
    const existing = await this.personaRepo.findById(userId, personaId);
    if (!existing) throw new NotFoundError("Persona");
    if (existing.source === "default") throw new ForbiddenError("デフォルトペルソナは削除できません");
    await this.personaRepo.remove(userId, personaId);
  }

  async generateDraft(userId: string, personaId: string): Promise<DraftResult> {
    const persona = await this.personaRepo.findById(userId, personaId);
    if (!persona) throw new NotFoundError("Persona");

    const attrs = [
      persona.type && `タイプ: ${personaTypeLabel(persona.type)}`,
      persona.age && `年齢: ${persona.age}歳`,
      persona.gender && `性別: ${persona.gender}`,
      persona.occupation && `職業: ${persona.occupation}`,
      persona.deviationScore && `偏差値: ${persona.deviationScore}`,
      persona.annualIncome && `年収: ${persona.annualIncome}万円`,
      persona.education && `学歴: ${persona.education}`,
    ]
      .filter(Boolean)
      .join("\n");

    return this.aiService.generateDraft(persona.displayName, attrs);
  }

  async getUploadUrl(userId: string, personaId: string, contentType: string): Promise<UploadUrlResult> {
    const existing = await this.personaRepo.findById(userId, personaId);
    if (!existing) throw new NotFoundError("Persona");

    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    const imageKey = `${userId}/personas/${personaId}.${ext}`;
    return this.storageService.getUploadUrl(imageKey, contentType);
  }
}

