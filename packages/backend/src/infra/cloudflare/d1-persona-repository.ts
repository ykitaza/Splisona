import type { PersonaRepository } from "../../domain/ports/persona-repository.js";
import type { Persona } from "../../domain/types.js";
import type { D1Database } from "./d1-types.js";

interface PersonaRow {
  persona_id: string;
  user_id: string;
  display_name: string;
  type: string;
  source: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  deviation_score: number | null;
  annual_income: number | null;
  education: string | null;
  free_text: string | null;
  avatar_image_key: string | null;
  created_at: string;
  updated_at: string;
}

function toDomain(row: PersonaRow): Persona {
  return {
    personaId: row.persona_id,
    userId: row.user_id,
    displayName: row.display_name,
    type: row.type,
    source: (row.source as Persona["source"]) ?? undefined,
    age: row.age ?? undefined,
    gender: row.gender ?? undefined,
    occupation: row.occupation ?? undefined,
    deviationScore: row.deviation_score ?? undefined,
    annualIncome: row.annual_income ?? undefined,
    education: row.education ?? undefined,
    freeText: row.free_text ?? undefined,
    avatarImageKey: row.avatar_image_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class D1PersonaRepository implements PersonaRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByUser(userId: string): Promise<Persona[]> {
    const result = await this.db
      .prepare("SELECT * FROM personas WHERE user_id = ?")
      .bind(userId)
      .all<PersonaRow>();
    return (result.results ?? []).map(toDomain);
  }

  async findById(userId: string, personaId: string): Promise<Persona | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM personas WHERE user_id = ? AND persona_id = ?")
      .bind(userId, personaId)
      .first<PersonaRow>();
    return row ? toDomain(row) : undefined;
  }

  async save(persona: Persona): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO personas
        (persona_id, user_id, display_name, type, source, age, gender, occupation,
         deviation_score, annual_income, education, free_text, avatar_image_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        persona.personaId, persona.userId, persona.displayName, persona.type,
        persona.source ?? null, persona.age ?? null, persona.gender ?? null,
        persona.occupation ?? null, persona.deviationScore ?? null,
        persona.annualIncome ?? null, persona.education ?? null,
        persona.freeText ?? null, persona.avatarImageKey ?? null,
        persona.createdAt, persona.updatedAt,
      )
      .run();
  }

  async saveAll(personas: Persona[]): Promise<void> {
    const stmts = personas.map((p) =>
      this.db
        .prepare(`INSERT OR REPLACE INTO personas
          (persona_id, user_id, display_name, type, source, age, gender, occupation,
           deviation_score, annual_income, education, free_text, avatar_image_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          p.personaId, p.userId, p.displayName, p.type,
          p.source ?? null, p.age ?? null, p.gender ?? null,
          p.occupation ?? null, p.deviationScore ?? null,
          p.annualIncome ?? null, p.education ?? null,
          p.freeText ?? null, p.avatarImageKey ?? null,
          p.createdAt, p.updatedAt,
        )
    );
    await this.db.batch(stmts);
  }

  async remove(userId: string, personaId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM personas WHERE user_id = ? AND persona_id = ?")
      .bind(userId, personaId)
      .run();
  }
}
