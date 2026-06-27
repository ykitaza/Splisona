import type { PersonaRepository } from "../../domain/ports/persona-repository.js";
import type { Persona } from "../../domain/types.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface PersonaDynamoRecord {
  PK: string;
  SK: string;
  displayName: string;
  type: string;
  source?: "preset" | "ai" | "default";
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
  avatarImageKey?: string;
  createdAt: string;
  updatedAt: string;
}

function toKey(userId: string, personaId: string) {
  return { PK: `USER#${userId}`, SK: `PERSONA#${personaId}` };
}

function toDomain(r: PersonaDynamoRecord): Persona {
  return {
    personaId: r.SK.replace("PERSONA#", ""),
    userId: r.PK.replace("USER#", ""),
    displayName: r.displayName,
    type: r.type,
    source: r.source,
    age: r.age,
    gender: r.gender,
    occupation: r.occupation,
    deviationScore: r.deviationScore,
    annualIncome: r.annualIncome,
    education: r.education,
    freeText: r.freeText,
    avatarImageKey: r.avatarImageKey,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toRecord(p: Persona): PersonaDynamoRecord {
  return {
    ...toKey(p.userId, p.personaId),
    displayName: p.displayName,
    type: p.type,
    source: p.source,
    age: p.age,
    gender: p.gender,
    occupation: p.occupation,
    deviationScore: p.deviationScore,
    annualIncome: p.annualIncome,
    education: p.education,
    freeText: p.freeText,
    avatarImageKey: p.avatarImageKey,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class DynamoPersonaRepository implements PersonaRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findAllByUser(userId: string): Promise<Persona[]> {
    const items = await this.db.queryByPK<PersonaDynamoRecord>(`USER#${userId}`, "PERSONA#");
    return items.map(toDomain);
  }

  async findById(userId: string, personaId: string): Promise<Persona | undefined> {
    const item = await this.db.getItem<PersonaDynamoRecord>(toKey(userId, personaId));
    return item ? toDomain(item) : undefined;
  }

  async save(persona: Persona): Promise<void> {
    await this.db.putItem(toRecord(persona) as unknown as Record<string, unknown>);
  }

  async saveAll(personas: Persona[]): Promise<void> {
    await Promise.all(personas.map((p) => this.save(p)));
  }

  async remove(userId: string, personaId: string): Promise<void> {
    await this.db.deleteItem(toKey(userId, personaId));
  }
}
