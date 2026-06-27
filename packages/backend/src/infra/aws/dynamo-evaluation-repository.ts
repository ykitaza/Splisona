import type { EvaluationRepository } from "../../domain/ports/evaluation-repository.js";
import type { Evaluation, EvaluationScores } from "../../domain/types.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface EvaluationDynamoRecord {
  PK: string;
  SK: string;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: EvaluationScores;
  scoresB: EvaluationScores;
  status: string;
  personaDisplayName: string;
  evaluatedAt: string;
}

function toKey(testId: string, personaId: string) {
  return { PK: `ABTEST#${testId}`, SK: `EVAL#${personaId}` };
}

function toDomain(r: EvaluationDynamoRecord): Evaluation {
  return {
    testId: r.PK.replace("ABTEST#", ""),
    personaId: r.SK.replace("EVAL#", ""),
    winner: r.winner,
    confidence: r.confidence,
    reason: r.reason,
    scoresA: r.scoresA,
    scoresB: r.scoresB,
    status: r.status as Evaluation["status"],
    personaDisplayName: r.personaDisplayName,
    evaluatedAt: r.evaluatedAt,
  };
}

function toRecord(e: Evaluation): EvaluationDynamoRecord {
  return {
    ...toKey(e.testId, e.personaId),
    winner: e.winner,
    confidence: e.confidence,
    reason: e.reason,
    scoresA: e.scoresA,
    scoresB: e.scoresB,
    status: e.status,
    personaDisplayName: e.personaDisplayName,
    evaluatedAt: e.evaluatedAt,
  };
}

export class DynamoEvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findAllByTest(testId: string): Promise<Evaluation[]> {
    const items = await this.db.queryByPK<EvaluationDynamoRecord>(`ABTEST#${testId}`, "EVAL#");
    return items.map(toDomain);
  }

  async save(evaluation: Evaluation): Promise<void> {
    await this.db.putItem(toRecord(evaluation) as unknown as Record<string, unknown>);
  }

  async removeAllByTest(testId: string): Promise<void> {
    const items = await this.db.queryByPK<EvaluationDynamoRecord>(`ABTEST#${testId}`, "EVAL#");
    await Promise.all(
      items.map((item) => this.db.deleteItem({ PK: item.PK, SK: item.SK }))
    );
  }
}
