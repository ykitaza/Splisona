import type { Persona } from "../types.js";

export interface PersonaRepository {
  findAllByUser(userId: string): Promise<Persona[]>;
  findById(userId: string, personaId: string): Promise<Persona | undefined>;
  save(persona: Persona): Promise<void>;
  saveAll(personas: Persona[]): Promise<void>;
  remove(userId: string, personaId: string): Promise<void>;
}
