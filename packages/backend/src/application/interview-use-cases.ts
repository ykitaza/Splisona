import type { PersonaRepository } from "../domain/ports/persona-repository.js";
import type { SettingsRepository } from "../domain/ports/settings-repository.js";
import type { AIService, ConversationMessage } from "../domain/ports/ai-service.js";
import type { Persona } from "../domain/types.js";
import { NotFoundError } from "./errors.js";

export class InterviewUseCases {
  constructor(
    private readonly personaRepo: PersonaRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly aiService: AIService,
  ) {}

  async chat(userId: string, personaId: string, messages: ConversationMessage[]): Promise<string> {
    const persona = await this.personaRepo.findById(userId, personaId);
    if (!persona) throw new NotFoundError("Persona");

    const additional = await this.getAdditionalInstruction(userId, "interview");
    const systemPrompt = buildSystemPrompt(persona, additional);

    return this.aiService.chat(systemPrompt, messages);
  }

  private async getAdditionalInstruction(userId: string, templateId: string): Promise<string> {
    const record = await this.settingsRepo.findBySection(userId, "prompt");
    const data = record?.data as Record<string, { additionalInstruction?: string }> | undefined;
    return data?.[templateId]?.additionalInstruction ?? "";
  }
}

function buildSystemPrompt(persona: Persona, additionalInstruction?: string): string {
  return [
    `あなたは「${persona.displayName}」という人物を演じてください。`,
    `タイプ: ${persona.type}`,
    persona.age ? `年齢: ${persona.age}歳` : null,
    persona.gender ? `性別: ${persona.gender}` : null,
    persona.occupation ? `職業: ${persona.occupation}` : null,
    persona.deviationScore ? `偏差値: ${persona.deviationScore}` : null,
    persona.annualIncome ? `年収: ${persona.annualIncome}万円` : null,
    persona.education ? `学歴: ${persona.education}` : null,
    persona.freeText ? `人物像: ${persona.freeText}` : null,
    "",
    "この人物として自然に会話してください。UXやデザインについて聞かれた場合は、この人物の視点で率直に答えてください。",
    additionalInstruction ? `\n追加指示:\n${additionalInstruction}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
