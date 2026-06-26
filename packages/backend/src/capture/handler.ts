import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { s3Client, IMAGE_BUCKET } from "../shared/s3.js";
import { captureFigmaNode, FigmaCaptureError } from "./figma.js";
import { captureWebsite, ScreenshotError } from "./screenshot.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function captureDesign(
  event: ApiGatewayEvent & { body?: string }
): Promise<LambdaResponse> {
  try {
    getUserId(event); // 認証確認

    const { side, inputType, url, figmaToken } = JSON.parse(event.body ?? "{}") as {
      side: string;
      inputType: string;
      url: string;
      figmaToken?: string;
    };

    if (!url) return json(400, { error: "url is required" });
    if (!["A", "B"].includes(side)) return json(400, { error: "side must be A or B" });

    let imageBuffer: Buffer;

    if (inputType === "figma_url") {
      const token = figmaToken ?? process.env.FIGMA_TOKEN;
      if (!token) return json(400, { error: "Figma トークンが設定されていません" });
      imageBuffer = await captureFigmaNode(url, token);
    } else if (inputType === "site_url") {
      imageBuffer = await captureWebsite(url);
    } else {
      return json(400, { error: `unsupported inputType: ${inputType}` });
    }

    const imageKey = `captures/${crypto.randomUUID()}-${side}.png`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: imageKey,
        Body: imageBuffer,
        ContentType: "image/png",
      })
    );

    const region = process.env.AWS_REGION ?? "us-east-1";
    const s3Endpoint = process.env.S3_ENDPOINT;
    const previewUrl = s3Endpoint
      ? `${s3Endpoint}/${IMAGE_BUCKET}/${imageKey}`
      : `https://${IMAGE_BUCKET}.s3.${region}.amazonaws.com/${imageKey}`;

    return json(200, { imageKey, previewUrl });
  } catch (e) {
    if (e instanceof FigmaCaptureError || e instanceof ScreenshotError) {
      return json(422, { error: e.message });
    }
    console.error("captureDesign error:", e);
    return json(500, { error: "キャプチャに失敗しました" });
  }
}
