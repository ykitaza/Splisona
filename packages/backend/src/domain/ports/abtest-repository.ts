import type { ABTest } from "../types.js";

export interface ABTestRepository {
  findAllByUser(userId: string): Promise<ABTest[]>;
  findById(userId: string, testId: string): Promise<ABTest | undefined>;
  save(test: ABTest): Promise<void>;
  remove(userId: string, testId: string): Promise<void>;
}
