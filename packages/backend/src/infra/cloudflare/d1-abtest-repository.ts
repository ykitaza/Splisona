import type { ABTestRepository } from "../../domain/ports/abtest-repository.js";
import type { ABTest } from "../../domain/types.js";
import type { D1Database } from "./d1-types.js";

interface ABTestRow {
  test_id: string;
  user_id: string;
  title: string;
  status: string;
  design_a_image_key: string | null;
  design_b_image_key: string | null;
  design_a_input_type: string;
  design_b_input_type: string;
  design_a_url: string | null;
  design_b_url: string | null;
  persona_ids: string;
  focus_points: string | null;
  reason_summary_status: string | null;
  reason_summary_a: string | null;
  reason_summary_b: string | null;
  winners_reason_summary: string | null;
  created_at: string;
  updated_at: string;
}

function toDomain(row: ABTestRow): ABTest {
  return {
    testId: row.test_id,
    userId: row.user_id,
    title: row.title,
    status: row.status as ABTest["status"],
    designAImageKey: row.design_a_image_key ?? undefined,
    designBImageKey: row.design_b_image_key ?? undefined,
    designAInputType: row.design_a_input_type as ABTest["designAInputType"],
    designBInputType: row.design_b_input_type as ABTest["designBInputType"],
    designAUrl: row.design_a_url ?? undefined,
    designBUrl: row.design_b_url ?? undefined,
    personaIds: JSON.parse(row.persona_ids) as string[],
    focusPoints: row.focus_points ?? undefined,
    reasonSummaryStatus: (row.reason_summary_status as ABTest["reasonSummaryStatus"]) ?? undefined,
    reasonSummaryA: row.reason_summary_a ? JSON.parse(row.reason_summary_a) as string[] : undefined,
    reasonSummaryB: row.reason_summary_b ? JSON.parse(row.reason_summary_b) as string[] : undefined,
    winnersReasonSummary: row.winners_reason_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class D1ABTestRepository implements ABTestRepository {
  constructor(private readonly db: D1Database) {}

  async findAllByUser(userId: string): Promise<ABTest[]> {
    const result = await this.db
      .prepare("SELECT * FROM abtests WHERE user_id = ?")
      .bind(userId)
      .all<ABTestRow>();
    return (result.results ?? []).map(toDomain);
  }

  async findById(userId: string, testId: string): Promise<ABTest | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM abtests WHERE user_id = ? AND test_id = ?")
      .bind(userId, testId)
      .first<ABTestRow>();
    return row ? toDomain(row) : undefined;
  }

  async save(test: ABTest): Promise<void> {
    await this.db
      .prepare(`INSERT OR REPLACE INTO abtests
        (test_id, user_id, title, status, design_a_image_key, design_b_image_key,
         design_a_input_type, design_b_input_type, design_a_url, design_b_url,
         persona_ids, focus_points, reason_summary_status, reason_summary_a, reason_summary_b,
         winners_reason_summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        test.testId, test.userId, test.title, test.status,
        test.designAImageKey ?? null, test.designBImageKey ?? null,
        test.designAInputType, test.designBInputType,
        test.designAUrl ?? null, test.designBUrl ?? null,
        JSON.stringify(test.personaIds),
        test.focusPoints ?? null,
        test.reasonSummaryStatus ?? null,
        test.reasonSummaryA ? JSON.stringify(test.reasonSummaryA) : null,
        test.reasonSummaryB ? JSON.stringify(test.reasonSummaryB) : null,
        test.winnersReasonSummary ?? null,
        test.createdAt, test.updatedAt,
      )
      .run();
  }

  async remove(userId: string, testId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM abtests WHERE user_id = ? AND test_id = ?")
      .bind(userId, testId)
      .run();
  }
}
