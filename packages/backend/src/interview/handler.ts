import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { getItem, personaKey } from "../shared/dynamo.js";
import { errorResponse } from "../shared/errors.js";
import { type PersonaRecord } from "../shared/types.js";
import { bedrockClient, MODEL_ID } from "../shared/bedrock.js";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function interviewPersona(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const personaId = event.pathParameters?.id ?? "";
    const persona = await getItem<PersonaRecord>(personaKey(userId, personaId) as unknown as Record<string, string>);
    if (!persona) return json(404, { error: "NOT_FOUND" });

    const { messages = [] }: { messages: ConversationMessage[] } = JSON.parse(event.body ?? "{}");

    const systemPrompt = buildSystemPrompt(persona);

    const res = await bedrockClient.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
      })
    );

    const content = (
      (res as { output: { message: { content: { text?: string }[] } } }).output.message.content
        .filter((c) => c.text !== undefined)
        .map((c) => c.text ?? "")
        .join("")
    );

    return json(200, { content });
  } catch {
    return errorResponse(503, "AI_UNAVAILABLE", "Bedrock call failed") as LambdaResponse;
  }
}

function buildSystemPrompt(persona: PersonaRecord): string {
  const lines = [
    `あなたは「${persona.displayName}」という人物を演じてください。`,
    `タイプ: ${persona.type}`,
    persona.age ? `年齢: ${persona.age}歳` : null,
    persona.gender ? `性別: ${persona.gender}` : null,
    persona.occupation ? `職業: ${persona.occupation}` : null,
    persona.deviationScore ? `偏差値: ${persona.deviationScore}` : null,
    persona.annualIncome ? `年収: ${persona.annualIncome}万円` : null,
    persona.education ? `学歴: ${persona.education}` : null,
    persona.freeText ? `人物像: ${persona.freeText}` : null,
    "",
    "この人物として自然に会話してください。UXやデザインについて聞かれた場合は、この人物の視点で率直に答えてください。",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return lines;
}
