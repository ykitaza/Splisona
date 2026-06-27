import { getUserId, type ApiGatewayEvent } from "../shared/auth.js";
import { createContainer, type AppContainer } from "../container.js";
import { captureFigmaNode, FigmaCaptureError } from "./figma.js";
import { captureWebsite, ScreenshotError } from "./screenshot.js";

type LambdaResponse = { statusCode: number; headers: Record<string, string>; body: string };

function json(statusCode: number, body: unknown): LambdaResponse {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer({ captureFigmaNode, captureWebsite });
  return _container;
}

export async function captureDesign(
  event: ApiGatewayEvent & { body?: string }
): Promise<LambdaResponse> {
  try {
    getUserId(event);
    const input = JSON.parse(event.body ?? "{}") as {
      side: string; inputType: string; url: string; figmaToken?: string;
    };

    if (!input.url) return json(400, { error: "url is required" });
    if (!["A", "B"].includes(input.side)) return json(400, { error: "side must be A or B" });

    const result = await container().captureUseCases.captureDesign(input);
    return json(200, result);
  } catch (e) {
    if (e instanceof FigmaCaptureError || e instanceof ScreenshotError) {
      return json(422, { error: e.message });
    }
    console.error("captureDesign error:", e);
    return json(500, { error: "キャプチャに失敗しました" });
  }
}
