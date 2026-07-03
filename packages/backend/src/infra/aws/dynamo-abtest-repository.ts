import type { ABTestRepository } from "../../domain/ports/abtest-repository.js";
import type { ABTest } from "../../domain/types.js";
import type { DynamoOperations } from "./dynamo-client.js";

interface ABTestDynamoRecord {
  PK: string;
  SK: string;
  title: string;
  status: "draft" | "running" | "completed" | "failed";
  designAImageKey?: string;
  designBImageKey?: string;
  designAInputType: "image_upload" | "figma_url" | "site_url";
  designBInputType: "image_upload" | "figma_url" | "site_url";
  designAUrl?: string;
  designBUrl?: string;
  personaIds: string[];
  reasonSummaryStatus?: "generating" | "generating_suggestions" | "ready";
  reasonSummaryA?: string[];
  reasonSummaryB?: string[];
  winnersReasonSummary?: string;
  createdAt: string;
  updatedAt: string;
}

function toKey(userId: string, testId: string) {
  return { PK: `USER#${userId}`, SK: `ABTEST#${testId}` };
}

function toDomain(r: ABTestDynamoRecord): ABTest {
  return {
    testId: r.SK.replace("ABTEST#", ""),
    userId: r.PK.replace("USER#", ""),
    title: r.title,
    status: r.status,
    designAImageKey: r.designAImageKey,
    designBImageKey: r.designBImageKey,
    designAInputType: r.designAInputType,
    designBInputType: r.designBInputType,
    designAUrl: r.designAUrl,
    designBUrl: r.designBUrl,
    personaIds: r.personaIds,
    reasonSummaryStatus: r.reasonSummaryStatus,
    reasonSummaryA: r.reasonSummaryA,
    reasonSummaryB: r.reasonSummaryB,
    winnersReasonSummary: r.winnersReasonSummary,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toRecord(t: ABTest): ABTestDynamoRecord {
  return {
    ...toKey(t.userId, t.testId),
    title: t.title,
    status: t.status,
    designAImageKey: t.designAImageKey,
    designBImageKey: t.designBImageKey,
    designAInputType: t.designAInputType,
    designBInputType: t.designBInputType,
    designAUrl: t.designAUrl,
    designBUrl: t.designBUrl,
    personaIds: t.personaIds,
    reasonSummaryStatus: t.reasonSummaryStatus,
    reasonSummaryA: t.reasonSummaryA,
    reasonSummaryB: t.reasonSummaryB,
    winnersReasonSummary: t.winnersReasonSummary,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export class DynamoABTestRepository implements ABTestRepository {
  constructor(private readonly db: DynamoOperations) {}

  async findAllByUser(userId: string): Promise<ABTest[]> {
    const items = await this.db.queryByPK<ABTestDynamoRecord>(`USER#${userId}`, "ABTEST#");
    return items.map(toDomain);
  }

  async findById(userId: string, testId: string): Promise<ABTest | undefined> {
    const item = await this.db.getItem<ABTestDynamoRecord>(toKey(userId, testId));
    return item ? toDomain(item) : undefined;
  }

  async save(test: ABTest): Promise<void> {
    await this.db.putItem(toRecord(test) as unknown as Record<string, unknown>);
  }

  async updateFields(userId: string, testId: string, fields: Partial<Pick<ABTest, 'status' | 'title' | 'reasonSummaryStatus' | 'reasonSummaryA' | 'reasonSummaryB' | 'winnersReasonSummary' | 'improvementReport' | 'executedBy' | 'updatedAt'>>): Promise<void> {
    const existing = await this.findById(userId, testId);
    if (!existing) return;
    await this.save({ ...existing, ...fields });
  }

  async remove(userId: string, testId: string): Promise<void> {
    await this.db.deleteItem(toKey(userId, testId));
  }
}
