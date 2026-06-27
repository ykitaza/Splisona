import type { UploadUrlResult } from "../types.js";

export interface StorageService {
  getUploadUrl(key: string, contentType: string): Promise<UploadUrlResult>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getPreviewUrl(key: string): string;
}
