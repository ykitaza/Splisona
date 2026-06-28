import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, extname } from "node:path";
import type { StorageService } from "../../domain/ports/storage-service.js";
import type { UploadUrlResult } from "../../domain/types.js";

export class FileStorageService implements StorageService {
  private readonly dir: string;
  private readonly baseUrl: string;

  constructor(dir: string, baseUrl: string) {
    this.dir = dir;
    this.baseUrl = baseUrl;
    mkdirSync(dir, { recursive: true });
  }

  private keyToPath(key: string): string {
    return join(this.dir, key.replace(/\//g, "_"));
  }

  async getUploadUrl(key: string, _contentType: string): Promise<UploadUrlResult> {
    return {
      uploadUrl: `${this.baseUrl}/images/${key}`,
      imageKey: key,
    };
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    writeFileSync(this.keyToPath(key), body);
  }

  getPreviewUrl(key: string): string {
    return `${this.baseUrl}/images/${key}`;
  }

  async copyObject(sourceKey: string, destKey: string): Promise<void> {
    const src = this.keyToPath(sourceKey);
    if (existsSync(src)) {
      copyFileSync(src, this.keyToPath(destKey));
    }
  }

  readFile(key: string): Buffer | null {
    const p = this.keyToPath(key);
    return existsSync(p) ? readFileSync(p) : null;
  }

  getImageFormat(key: string): "png" | "jpeg" | "gif" | "webp" {
    const ext = extname(key).slice(1).toLowerCase();
    if (ext === "jpg") return "jpeg";
    if (ext === "jpeg" || ext === "gif" || ext === "webp") return ext as "jpeg" | "gif" | "webp";
    return "png";
  }
}
