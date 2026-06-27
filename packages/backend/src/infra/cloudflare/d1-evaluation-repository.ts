import type { EvaluationRepository } from "../../domain/ports/evaluation-repository.js";
import type { Evaluation, EvaluationScores } from "../../domain/types.js";
import type { D1Database } from "./d1-types.js";

interface EvaluationRow {
  test_id: string;
  persona_id: string;
  winner: string;
  confidence: number;
  reason: string;
  scores_a: string;
  scores_b: string;
  status: string;
  persona_display_name: string;
  evaluated_at: string;
}

function toDomain(row: EvaluationRow): Evaluation {
  return {
    testId: row.test_id,
    personaId: row.persona_id,
    winner: row.winner as Evaluation["winner"],
    confidence: row.confidence,
    reason: row.reason,
    scoresA: JSON.parse(row.scores_a) as EvaluationScores,
    scoresB: JSON.parse(row.scores_b) as EvaluationScores,
    status: row.status as Evaluation["status"],
    personaDisplayName: row.persona_display_name,
    evaluatedAt: row.evaluated_at,
  };
}

export class D1EvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByTest(testId: string): Promise<Evaluation[]> {
    const result = await this.db
      .prepare("SELECT * FROM evaluations WHERE test_id = ?")
      .bind(testId)
      .all<EvaluationRow>();
    return (result.results ?? []).map(toDomain);
  }

  async save(evaluation: Evaluation): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO evaluations
        (test_id, persona_id, winner, confidence, reason, scores_a, scores_b,
         status, persona_display_name, evaluated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        evaluation.testId, evaluation.personaId, evaluation.winner,
        evaluation.confidence, evaluation.reason,
        JSON.stringify(evaluation.scoresA), JSON.stringify(evaluation.scoresB),
        evaluation.status, evaluation.personaDisplayName, evaluation.evaluatedAt,
      )
      .run();
  }

  async removeAllByTest(testId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM evaluations WHERE test_id = ?")
      .bind(testId)
      .run();
  }
}
