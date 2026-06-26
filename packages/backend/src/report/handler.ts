import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { queryByPK, getItem, abtestKey } from "../shared/dynamo.js";
import { errorResponse } from "../shared/errors.js";
import type { ABTestRecord, EvaluationRecord } from "../shared/types.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function toABTest(r: ABTestRecord) {
  const testId = r.SK.replace("ABTEST#", "");
  const userId = r.PK.replace("USER#", "");
  return {
    testId,
    userId,
    title: r.title,
    status: r.status,
    designAInput: { inputType: r.designAInputType, imageKey: r.designAImageKey },
    designBInput: { inputType: r.designBInputType, imageKey: r.designBImageKey },
    personaIds: r.personaIds,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function zeroScores() {
  return { usability: 0, aesthetics: 0, clarity: 0, engagement: 0 };
}

function computeSummary(evaluations: EvaluationRecord[], totalPersonas: number) {
  const completed = evaluations.filter((e) => e.status === "completed");
  const completedPersonas = completed.length;

  const countA = completed.filter((e) => e.winner === "A").length;
  const countB = completed.filter((e) => e.winner === "B").length;

  const supportRateA = completedPersonas > 0 ? countA / completedPersonas : 0;
  const supportRateB = completedPersonas > 0 ? countB / completedPersonas : 0;

  const winner: "A" | "B" | "tie" =
    countA > countB ? "A" : countB > countA ? "B" : "tie";

  const sumScores = (items: EvaluationRecord[]) =>
    items.reduce(
      (acc, e) => ({
        usability: acc.usability + e.scores.usability,
        aesthetics: acc.aesthetics + e.scores.aesthetics,
        clarity: acc.clarity + e.scores.clarity,
        engagement: acc.engagement + e.scores.engagement,
      }),
      zeroScores()
    );

  const avgOf = (sum: ReturnType<typeof zeroScores>, count: number) =>
    count > 0
      ? {
          usability: sum.usability / count,
          aesthetics: sum.aesthetics / count,
          clarity: sum.clarity / count,
          engagement: sum.engagement / count,
        }
      : zeroScores();

  const completedA = completed.filter((e) => e.winner === "A");
  const completedB = completed.filter((e) => e.winner === "B");

  return {
    winner,
    supportRateA,
    supportRateB,
    totalPersonas,
    completedPersonas,
    avgScores: {
      A: avgOf(sumScores(completedA), completedA.length),
      B: avgOf(sumScores(completedB), completedB.length),
    },
    winnersReasonSummary: "",
  };
}

export async function listTestsForReport(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const items = await queryByPK<ABTestRecord>(`USER#${userId}`, "ABTEST#");
    return json(200, items.map(toABTest));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getReport(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";

    const test = await getItem<ABTestRecord>(
      abtestKey(userId, testId) as unknown as Record<string, string>
    );
    if (!test) return json(404, { error: "NOT_FOUND" });

    const evaluations = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");

    const summary = computeSummary(evaluations, test.personaIds.length);

    const evaluationResults = evaluations.map((e) => ({
      personaId: e.SK.replace("EVAL#", ""),
      personaDisplayName: e.personaDisplayName,
      winner: e.winner,
      confidence: e.confidence,
      reason: e.reason,
      scores: e.scores,
      status: e.status,
    }));

    return json(200, {
      abTest: toABTest(test),
      summary,
      evaluations: evaluationResults,
    });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function exportReport(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";

    const test = await getItem<ABTestRecord>(
      abtestKey(userId, testId) as unknown as Record<string, string>
    );
    if (!test) return json(404, { error: "NOT_FOUND" });

    const evaluations = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");

    const header = "personaId,displayName,winner,confidence,reason,usability,aesthetics,clarity,engagement,status";
    const rows = evaluations.map((e) => {
      const personaId = e.SK.replace("EVAL#", "");
      const cols = [
        personaId,
        e.personaDisplayName,
        e.winner,
        String(e.confidence),
        `"${e.reason.replace(/"/g, '""')}"`,
        String(e.scores.usability),
        String(e.scores.aesthetics),
        String(e.scores.clarity),
        String(e.scores.engagement),
        e.status,
      ];
      return cols.join(",");
    });

    const csv = [header, ...rows].join("\n");

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/csv" },
      body: csv,
    };
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}
