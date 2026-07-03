import crypto from "node:crypto";
import type { StorageService } from "../domain/ports/storage-service.js";

export class CaptureUseCases {
  constructor(
    private readonly storageService: StorageService,
    private readonly captureFigmaNode: (url: string, token: string) => Promise<Buffer>,
    private readonly captureWebsite: (url: string) => Promise<{ full: Buffer; segments: Buffer[] }>,
  ) {}

  async captureDesign(input: {
    side: string;
    inputType: string;
    url: string;
    figmaToken?: string;
  }): Promise<{ imageKey: string; previewUrl: string; segmentKeys?: string[] }> {
    const { side, inputType, url, figmaToken } = input;

    let imageBuffer: Buffer;
    let segments: Buffer[] = [];

    if (inputType === "figma_url") {
      const token = figmaToken ?? process.env.FIGMA_TOKEN;
      if (!token) throw new Error("Figma トークンが設定されていません");
      imageBuffer = await this.captureFigmaNode(url, token);
    } else if (inputType === "site_url") {
      const result = await this.captureWebsite(url);
      imageBuffer = result.full;
      segments = result.segments;
    } else {
      throw new Error(`unsupported inputType: ${inputType}`);
    }

    const id = crypto.randomUUID();
    const imageKey = `captures/${id}-${side}.png`;
    await this.storageService.putObject(imageKey, imageBuffer, "image/png");
    const previewUrl = this.storageService.getPreviewUrl(imageKey);

    let segmentKeys: string[] | undefined;
    if (segments.length > 0) {
      segmentKeys = [];
      for (let i = 0; i < segments.length; i++) {
        const segKey = `captures/${id}-${side}-seg${i + 1}.png`;
        await this.storageService.putObject(segKey, segments[i], "image/png");
        segmentKeys.push(segKey);
      }
    }

    return { imageKey, previewUrl, segmentKeys };
  }
}
