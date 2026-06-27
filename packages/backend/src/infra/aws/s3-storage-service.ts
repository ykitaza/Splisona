import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageService } from "../../domain/ports/storage-service.js";
import type { UploadUrlResult } from "../../domain/types.js";

export class S3StorageService implements StorageService {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly region: string,
    private readonly endpoint?: string,
  ) {}

  async getUploadUrl(key: string, contentType: string): Promise<UploadUrlResult> {
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 900 }
    );
    return { uploadUrl, imageKey: key };
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  getPreviewUrl(key: string): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
