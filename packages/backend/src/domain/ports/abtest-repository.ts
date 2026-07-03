import type { ABTest } from "../types.js";

export interface ABTestRepository {
  findAllByUser(userId: string): Promise<ABTest[]>;
  findById(userId: string, testId: string): Promise<ABTest | undefined>;
  save(test: ABTest): Promise<void>;
  updateFields(userId: string, testId: string, fields: Partial<Pick<ABTest, 'status' | 'title' | 'reasonSummaryStatus' | 'reasonSummaryA' | 'reasonSummaryB' | 'winnersReasonSummary' | 'improvementReport' | 'executedBy' | 'updatedAt'>>): Promise<void>;
  remove(userId: string, testId: string): Promise<void>;
}
