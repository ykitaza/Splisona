import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { queryByPK, putItem, getItem, deleteItem, abtestKey, evaluationKey } from "../shared/dynamo.js";
import { badRequest, errorResponse } from "../shared/errors.js";
import { type ABTestRecord, type EvaluationRecord } from "../shared/types.js";
import { s3Client, IMAGE_BUCKET } from "../shared/s3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function createTest(
  event: ApiGatewayEvent & { body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const input = JSON.parse(event.body ?? "{}");
    if (!input.title?.trim()) return badRequest("title is required", ["title"]) as LambdaResponse;

    const testId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dA = input.designAInput ?? {};
    const dB = input.designBInput ?? {};
    const record: ABTestRecord = {
      ...abtestKey(userId, testId),
      title: input.title,
      status: "draft",
      designAInputType: dA.inputType ?? input.designAInputType ?? "image_upload",
      designBInputType: dB.inputType ?? input.designBInputType ?? "image_upload",
      designAImageKey: dA.imageKey ?? input.designAImageKey,
      designBImageKey: dB.imageKey ?? input.designBImageKey,
      designAUrl: dA.figmaUrl ?? dA.siteUrl,
      designBUrl: dB.figmaUrl ?? dB.siteUrl,
      personaIds: input.personaIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await putItem(record as unknown as Record<string, unknown>);
    return json(201, toABTest(record));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function listTests(event: ApiGatewayEvent): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const items = await queryByPK<ABTestRecord>(`USER#${userId}`, "ABTEST#");
    return json(200, items.map(toABTest));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const item = await getItem<ABTestRecord>(abtestKey(userId, testId) as unknown as Record<string, string>);
    if (!item) return json(404, { error: "NOT_FOUND" });
    return json(200, toABTest(item));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function updateTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const input = JSON.parse(event.body ?? "{}");

    const existing = await getItem<ABTestRecord>(abtestKey(userId, testId) as unknown as Record<string, string>);
    if (!existing) return json(404, { error: "NOT_FOUND" });

    const now = new Date().toISOString();
    const dA = input.designAInput ?? {};
    const dB = input.designBInput ?? {};
    const updated: ABTestRecord = {
      ...existing,
      ...Object.fromEntries(
        Object.entries({
          title: input.title,
          designAInputType: dA.inputType ?? input.designAInputType,
          designBInputType: dB.inputType ?? input.designBInputType,
          designAImageKey: dA.imageKey ?? input.designAImageKey,
          designBImageKey: dB.imageKey ?? input.designBImageKey,
          designAUrl: dA.figmaUrl ?? dA.siteUrl,
          designBUrl: dB.figmaUrl ?? dB.siteUrl,
          personaIds: input.personaIds,
        }).filter(([, v]) => v !== undefined)
      ),
      updatedAt: now,
    } as ABTestRecord;

    await putItem(updated as unknown as Record<string, unknown>);
    return json(200, toABTest(updated));
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function deleteTest(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    await deleteItem(abtestKey(userId, testId) as unknown as Record<string, string>);
    return json(200, { deleted: true });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getUploadUrl(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string>; body?: string }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";
    const { side, contentType = "image/png" } = JSON.parse(event.body ?? "{}");

    const existing = await getItem<ABTestRecord>(abtestKey(userId, testId) as unknown as Record<string, string>);
    if (!existing) return json(404, { error: "NOT_FOUND" });

    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    const imageKey = `${userId}/${testId}/${side}.${ext}`;

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: IMAGE_BUCKET, Key: imageKey, ContentType: contentType }),
      { expiresIn: 900 }
    );

    return json(200, { uploadUrl, imageKey });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
}

export async function getProgress(
  event: ApiGatewayEvent & { pathParameters?: Record<string, string> }
): Promise<LambdaResponse> {
  try {
    const userId = getUserId(event);
    const testId = event.pathParameters?.id ?? "";

    const test = await getItem<ABTestRecord>(abtestKey(userId, testId) as unknown as Record<string, string>);
    if (!test) return json(404, { error: "NOT_FOUND" });

    const evaluations = await queryByPK<EvaluationRecord>(`ABTEST#${testId}`, "EVAL#");
    const completed = evaluations.filter((e) => e.status === "completed").length;
    const failed = evaluations.filter((e) => e.status === "failed").length;

    return json(200, {
      total: test.personaIds.length,
      completed,
      failed,
      status: test.status,
    });
  } catch (e) {
    return errorResponse(500, "INTERNAL_ERROR", String(e)) as LambdaResponse;
  }
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

// evaluationKey は dynamo.ts で定義済み（将来の evaluation handler 用）
void evaluationKey;
