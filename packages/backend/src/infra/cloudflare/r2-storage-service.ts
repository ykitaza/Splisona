import type { StorageService } from "../../domain/ports/storage-service.js";
import type { UploadUrlResult } from "../../domain/types.js";

export interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<unknown>;
}

export class R2StorageService implements StorageService {
  constructor(
    private readonly bucket: R2Bucket,
    private readonly publicUrl: string,
    private readonly workerUrl: string,
  ) {}

  async getUploadUrl(key: string, contentType: string): Promise<UploadUrlResult> {
    return {
      uploadUrl: `${this.workerUrl}/upload/${key}?contentType=${encodeURIComponent(contentType)}`,
      imageKey: key,
    };
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const arrayBuffer = new Uint8Array(body).buffer as ArrayBuffer;
    await this.bucket.put(key, arrayBuffer, {
      httpMetadata: { contentType },
    });
  }

  getPreviewUrl(key: string): string {
    return `${this.workerUrl}/images/${key}`;
  }
}
