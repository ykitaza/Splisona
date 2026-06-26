import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { queryByPK, getItem, abtestKey } from "../shared/dynamo.js";
import { errorResponse } from "../shared/errors.js";
import { bedrockClient, MODEL_ID } from "../shared/bedrock.js";
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
    designAInput: { inputType: r.designAInputType, imageKey: r.designAImageKey, ...(r.designAUrl ? (r.designAInputType === 'figma_url' ? { figmaUrl: r.designAUrl } : { siteUrl: r.designAUrl }) : {}) },
    designBInput: { inputType: r.designBInputType, imageKey: r.designBImageKey, ...(r.designBUrl ? (r.designBInputType === 'figma_url' ? { figmaUrl: r.designBUrl } : { siteUrl: r.designBUrl }) : {}) },
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
  const countNone = completed.filter((e) => e.winner === "none").length;

  const supportRateA = completedPersonas > 0 ? countA / completedPersonas : 0;
  const supportRateB = completedPersonas > 0 ? countB / completedPersonas : 0;
  const supportRateNone = completedPersonas > 0 ? countNone / completedPersonas : 0;

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
    supportRateNone,
    totalPersonas,
    completedPersonas,
    avgScores: {
      A: avgOf(sumScores(completedA), completedA.length),
      B: avgOf(sumScores(completedB), completedB.length),
    },
    winnersReasonSummary: "",
    reasonSummaryA: [] as string[],
    reasonSummaryB: [] as string[],
  };
}

const summarizeReasonsTool = {
  toolSpec: {
    name: "summarize_reasons",
    description:
      "複数ペルソナの評価コメントを横断して、A案が支持された理由とB案が評価された点を、それぞれ簡潔な日本語の箇条書きにまとめる",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          reasonsA: {
            type: "array",
            items: { type: "string" },
            description:
              "A案が支持された理由。3〜4項目。似た意見は1項目に統合し、体言止め〜一文で簡潔に。A案支持者がいなければ空配列。",
          },
          reasonsB: {
            type: "array",
            items: { type: "string" },
            description:
              "B案が評価された点。2〜4項目。似た意見は1項目に統合し、体言止め〜一文で簡潔に。B案支持者がいなければ空配列。",
          },
        },
        required: ["reasonsA", "reasonsB"],
      },
    },
  },
};

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

async function summarizeReasons(
  completed: EvaluationRecord[]
): Promise<{ reasonsA: string[]; reasonsB: string[] }> {
  const a = completed.filter((e) => e.winner === "A" && e.reason);
  const b = completed.filter((e) => e.winner === "B" && e.reason);
  if (a.length === 0 && b.length === 0) return { reasonsA: [], reasonsB: [] };

  // Bedrock 失敗時は生コメントをそのまま箇条書きに落とすフォールバック
  const fallback = () => ({
    reasonsA: dedupe(a.map((e) => e.reason)).slice(0, 4),
    reasonsB: dedupe(b.map((e) => e.reason)).slice(0, 4),
  });

  try {
    const text = [
      "A案を支持したペルソナの理由:",
      ...(a.length ? a.map((e) => `- ${e.personaDisplayName}: ${e.reason}`) : ["- （該当なし）"]),
      "",
      "B案を支持したペルソナの理由:",
      ...(b.length ? b.map((e) => `- ${e.personaDisplayName}: ${e.reason}`) : ["- （該当なし）"]),
      "",
      "上記を踏まえ、summarize_reasons ツールで、A案が支持された理由とB案が評価された点を、それぞれ簡潔な日本語の箇条書きにまとめてください。似た意見は1項目に統合してください。",
    ].join("\n");

    const command = new ConverseCommand({
      modelId: MODEL_ID,
      inferenceConfig: { temperature: 0.2 },
      messages: [{ role: "user", content: [{ text }] }],
      toolConfig: {
        tools: [summarizeReasonsTool],
        toolChoice: { tool: { name: "summarize_reasons" } },
      },
    });

    const response = (await bedrockClient.send(command)) as {
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };
    const block = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "summarize_reasons"
    );
    const input = block?.toolUse?.input as { reasonsA?: string[]; reasonsB?: string[] } | undefined;
    if (!input) return fallback();

    return {
      reasonsA: Array.isArray(input.reasonsA) ? dedupe(input.reasonsA) : [],
      reasonsB: Array.isArray(input.reasonsB) ? dedupe(input.reasonsB) : [],
    };
  } catch {
    return fallback();
  }
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

    // 要約は完了時のみ生成（実行中のポーリングで毎回 Bedrock を呼ばない）
    if (test.status === "completed") {
      const completed = evaluations.filter((e) => e.status === "completed");
      const { reasonsA, reasonsB } = await summarizeReasons(completed);
      summary.reasonSummaryA = reasonsA;
      summary.reasonSummaryB = reasonsB;
      const winnerReasons =
        summary.winner === "A" ? reasonsA : summary.winner === "B" ? reasonsB : [];
      summary.winnersReasonSummary = winnerReasons.join("、");
    }

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
