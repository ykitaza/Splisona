import type { Evaluation } from "../types.js";

export interface EvaluationRepository {
  findAllByTest(testId: string): Promise<Evaluation[]>;
  save(evaluation: Evaluation): Promise<void>;
  removeAllByTest(testId: string): Promise<void>;
}
