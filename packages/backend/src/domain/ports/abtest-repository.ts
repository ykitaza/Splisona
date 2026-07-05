import type { ABTest } from "../types.js";

export type ABTestUpdatableFields = Partial<Pick<ABTest, 'status' | 'title' | 'reasonSummaryStatus' | 'reasonSummaryA' | 'reasonSummaryB' | 'winnersReasonSummary' | 'improvementReport' | 'executedBy' | 'updatedAt'>>;

export interface ABTestRepository {
  findAllByUser(userId: string): Promise<ABTest[]>;
  findById(userId: string, testId: string): Promise<ABTest | undefined>;
  save(test: ABTest): Promise<void>;
  updateFields(userId: string, testId: string, fields: ABTestUpdatableFields): Promise<void>;
  remove(userId: string, testId: string): Promise<void>;
}
