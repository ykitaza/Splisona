import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { getItem, putItem, abtestKey, evaluationKey, queryByPK } from "../shared/dynamo.js";
import { errorResponse } from "../shared/errors.js";
import { bedrockClient, MODEL_ID } from "../shared/bedrock.js";
import { generateReasonSummaryFields } from "../report/handler.js";
import type { ABTestRecord, EvaluationRecord, PersonaRecord } from "../shared/types.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluateDesignsTool: any = {
  toolSpec: {
    name: "evaluate_designs",
    description: "デザインA/Bのどちらがペルソナ視点で優れているかを評価し、各案を軸ごとに採点する",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          winner: { type: "string", enum: ["A", "B", "none"] },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          reason: { type: "string" },
          scoresA: {
            type: "object",
            description: "デザインA案の各軸スコア（0〜100）",
            properties: {
              usability: { type: "number", minimum: 0, maximum: 100 },
              aesthetics: { type: "number", minimum: 0, maximum: 100 },
              clarity: { type: "number", minimum: 0, maximum: 100 },
              engagement: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["usability", "aesthetics", "clarity", "engagement"],
          },
          scoresB: {
            type: "object",
            description: "デザインB案の各軸スコア（0〜100）",
            properties: {
              usability: { type: "number", minimum: 0, maximum: 100 },
              aesthetics: { type: "number", minimum: 0, maximum: 100 },
              clarity: { type: "number", minimum: 0, maximum: 100 },
              engagement: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["usability", "aesthetics", "clarity", "engagement"],
          },
        },
        required: ["winner", "reason", "scoresA", "scoresB"],
      },
    },
  },
};

async function invokeWithRetry(command: ConverseCommand, maxRetries = 3): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await bedrockClient.send(command);
    } catch (e: unknown) {
      const name = (e as { name?: string }).name;
      if (name === "ThrottlingException" && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        lastError = e;
      } else {
        throw e;
      }
    }
  }
  throw lastError;
}

async function evaluateOnePersona(
  testId: string,
  personaId: string,
  userId: string,
  imageKeyA: string,
  imageKeyB: string
): Promise<void> {
  const persona = await getItem<PersonaRecord>(
    { PK: `USER#${userId}`, SK: `PERSONA#${personaId}` } as unknown as Record<string, string>
  );

  const personaDisplayName = persona?.displayName ?? personaId;
  const imageBucket = process.env.IMAGE_BUCKET ?? "chorus-images";
  const prompt = [
    `あなたは「${personaDisplayName}」というペルソナです。`,
    `タイプ: ${persona?.type ?? "consumer"}`,
    persona?.occupation ? `職業: ${persona.occupation}` : null,
    persona?.freeText ? `詳細: ${persona.freeText}` : null,
    "",
    "最初の画像がデザインA、次の画像がデザインBです。",
    "あなたのペルソナ視点から evaluate_designs ツールを使って評価してください。",
    "scoresA と scoresB に、A案・B案それぞれの各軸スコア（0〜100）を採点してください。reason は必ず日本語で記述してください。",
  ].filter((l) => l !== null).join("\n");

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    inferenceConfig: { temperature: 0.2 },
    messages: [{
      role: "user",
      content: [
        { text: prompt },
        { image: { format: "png", source: { s3Location: { uri: `s3://${imageBucket}/${imageKeyA}` } } } },
        { image: { format: "png", source: { s3Location: { uri: `s3://${imageBucket}/${imageKeyB}` } } } },
      ],
    }],
    toolConfig: {
      tools: [evaluateDesignsTool],
      toolChoice: { tool: { name: "evaluate_designs" } },
    },
  });

  try {
    const response = await invokeWithRetry(command) as {
      stopReason: string;
      output?: { message?: { content?: Array<{ toolUse?: { name: string; input: unknown } }> } };
    };

    if (response.stopReason !== "tool_use") {
      throw new Error(`Unexpected stopReason: ${response.stopReason}`);
    }

    const toolUseBlock = response.output?.message?.content?.find(
      (c) => c.toolUse?.name === "evaluate_designs"
    );
    if (!toolUseBlock?.toolUse) {
      throw new Error("evaluate_designs tool use not found in response");
    }

    const input = toolUseBlock.toolUse.input as {
      winner: "A" | "B";
      confidence?: number;
      reason: string;
      scoresA: { usability: number; aesthetics: number; clarity: number; engagement: number };
      scoresB: { usability: number; aesthetics: number; clarity: number; engagement: number };
    };

    const evalRecord: EvaluationRecord = {
      ...evaluationKey(testId, personaId),
      winner: input.winner,
      confidence: input.confidence ?? 0,
      reason: input.reason,
      scoresA: input.scoresA,
      scoresB: input.scoresB,
      status: "completed",
      personaDisplayName,
      evaluatedAt: new Date().toISOString(),
    };
    await putItem(evalRecord as unknown as Record<string, unknown>);
  } catch {
    const failRecord: EvaluationRecord = {
      ...evaluationKey(testId, personaId),
      winner: "none",
      confidence: 0,
      reason: "",
      scoresA: { usability: 0, aesthetics: 0, clarity: 0, engagement: 0 },
      scoresB: { usability: 0, aesthetics: 0, clarity: 0, engagement: 0 },
      status: "failed",
      personaDisplayName,
      evaluatedAt: new Date().toISOString(),
    };
    await putItem(failRecord as unknown as Record<string, unknown>);
  }
}

export async function executeTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";

    const test = await getItem<ABTestRecord>(
      abtestKey(userId, testId) as unknown as Record<string, string>
    );
    if (!test) return json(404, { error: "NOT_FOUND" });
    if (test.status === "running") return json(409, { error: "CONFLICT", message: "Test is already running" });

    if (!test.designAImageKey || !test.designBImageKey) {
      return json(400, { error: "VALIDATION_ERROR", message: "Both design images must be set" });
    }
    if (!test.personaIds || test.personaIds.length === 0) {
      return json(400, { error: "VALIDATION_ERROR", message: "At least one persona must be selected" });
    }

    // 再実行時は古い理由要約キャッシュを破棄する
    const { reasonSummaryStatus: _s, reasonSummaryA: _a, reasonSummaryB: _b, winnersReasonSummary: _w, ...testBase } = test;
    void _s; void _a; void _b; void _w;
    await putItem({
      ...testBase,
      status: "running",
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);

    const batches = chunkArray(test.personaIds, 25);
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map((personaId) =>
          evaluateOnePersona(testId, personaId, userId, test.designAImageKey!, test.designBImageKey!)
        )
      );
    }

    // 完了時に理由要約を生成してキャッシュ（レポート表示時には推論しない）
    const evals = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
    const completedEvals = evals.filter((e) => e.status === "completed");
    const summaryFields = await generateReasonSummaryFields(completedEvals);

    await putItem({
      ...testBase,
      status: "completed",
      ...summaryFields,
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);

    return json(200, { started: true });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}
