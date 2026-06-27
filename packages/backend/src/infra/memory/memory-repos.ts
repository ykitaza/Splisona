import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PersonaRepository } from "../../domain/ports/persona-repository.js";
import type { ABTestRepository } from "../../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../../domain/ports/evaluation-repository.js";
import type { SettingsRepository } from "../../domain/ports/settings-repository.js";
import type { Persona, ABTest, Evaluation, SettingsRecord } from "../../domain/types.js";

const DATA_DIR = process.env.CHORUS_DATA_DIR ?? "/tmp/chorus-data";
mkdirSync(DATA_DIR, { recursive: true });

function loadJson<T>(name: string, fallback: T): T {
  const p = join(DATA_DIR, `${name}.json`);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, "utf-8")); }
  catch { return fallback; }
}

function saveJson(name: string, data: unknown): void {
  writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

export class MemoryPersonaRepository implements PersonaRepository {
  private store: Map<string, Persona>;

  constructor() {
    const entries = loadJson<[string, Persona][]>("personas", []);
    this.store = new Map(entries);
  }

  private flush() { saveJson("personas", [...this.store.entries()]); }

  async findAllByUser(userId: string): Promise<Persona[]> {
    return [...this.store.values()].filter((p) => p.userId === userId);
  }

  async findById(userId: string, personaId: string): Promise<Persona | undefined> {
    const p = this.store.get(personaId);
    return p?.userId === userId ? p : undefined;
  }

  async save(persona: Persona): Promise<void> {
    this.store.set(persona.personaId, persona);
    this.flush();
  }

  async saveAll(personas: Persona[]): Promise<void> {
    for (const p of personas) this.store.set(p.personaId, p);
    this.flush();
  }

  async remove(userId: string, personaId: string): Promise<void> {
    const p = this.store.get(personaId);
    if (p?.userId === userId) { this.store.delete(personaId); this.flush(); }
  }
}

export class MemoryABTestRepository implements ABTestRepository {
  private store: Map<string, ABTest>;

  constructor() {
    const entries = loadJson<[string, ABTest][]>("abtests", []);
    this.store = new Map(entries);
  }

  private flush() { saveJson("abtests", [...this.store.entries()]); }

  async findAllByUser(userId: string): Promise<ABTest[]> {
    return [...this.store.values()].filter((t) => t.userId === userId);
  }

  async findById(userId: string, testId: string): Promise<ABTest | undefined> {
    const t = this.store.get(testId);
    return t?.userId === userId ? t : undefined;
  }

  async save(test: ABTest): Promise<void> {
    this.store.set(test.testId, test);
    this.flush();
  }

  async remove(userId: string, testId: string): Promise<void> {
    const t = this.store.get(testId);
    if (t?.userId === userId) { this.store.delete(testId); this.flush(); }
  }
}

export class MemoryEvaluationRepository implements EvaluationRepository {
  private store: Map<string, Evaluation[]>;

  constructor() {
    const entries: [string, Evaluation[]][] = loadJson("evaluations", []);
    this.store = new Map(entries);
  }

  private flush() { saveJson("evaluations", [...this.store.entries()]); }

  async findAllByTest(testId: string): Promise<Evaluation[]> {
    return this.store.get(testId) ?? [];
  }

  async save(evaluation: Evaluation): Promise<void> {
    const list = this.store.get(evaluation.testId) ?? [];
    const idx = list.findIndex((e) => e.personaId === evaluation.personaId);
    if (idx >= 0) list[idx] = evaluation;
    else list.push(evaluation);
    this.store.set(evaluation.testId, list);
    this.flush();
  }

  async removeAllByTest(testId: string): Promise<void> {
    this.store.delete(testId);
    this.flush();
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  private store: Map<string, SettingsRecord[]>;

  constructor() {
    const entries: [string, SettingsRecord[]][] = loadJson("settings", []);
    this.store = new Map(entries);
  }

  private flush() { saveJson("settings", [...this.store.entries()]); }

  async findAllByUser(userId: string): Promise<SettingsRecord[]> {
    return this.store.get(userId) ?? [];
  }

  async findBySection(userId: string, section: string): Promise<SettingsRecord | undefined> {
    return (this.store.get(userId) ?? []).find((r) => r.section === section);
  }

  async save(userId: string, record: SettingsRecord): Promise<void> {
    const list = this.store.get(userId) ?? [];
    const idx = list.findIndex((r) => r.section === record.section);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    this.store.set(userId, list);
    this.flush();
  }
}
