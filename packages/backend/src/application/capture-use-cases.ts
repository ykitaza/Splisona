import crypto from "node:crypto";
import type { StorageService } from "../domain/ports/storage-service.js";

export class CaptureUseCases {
  constructor(
    private readonly storageService: StorageService,
    private readonly captureFigmaNode: (url: string, token: string) => Promise<Buffer>,
    private readonly captureWebsite: (url: string) => Promise<Buffer>,
  ) {}

  async captureDesign(input: {
    side: string;
    inputType: string;
    url: string;
    figmaToken?: string;
  }): Promise<{ imageKey: string; previewUrl: string }> {
    const { side, inputType, url, figmaToken } = input;

    let imageBuffer: Buffer;

    if (inputType === "figma_url") {
      const token = figmaToken ?? process.env.FIGMA_TOKEN;
      if (!token) throw new Error("Figma トークンが設定されていません");
      imageBuffer = await this.captureFigmaNode(url, token);
    } else if (inputType === "site_url") {
      imageBuffer = await this.captureWebsite(url);
    } else {
      throw new Error(`unsupported inputType: ${inputType}`);
    }

    const imageKey = `captures/${crypto.randomUUID()}-${side}.png`;
    await this.storageService.putObject(imageKey, imageBuffer, "image/png");
    const previewUrl = this.storageService.getPreviewUrl(imageKey);

    return { imageKey, previewUrl };
  }
}
