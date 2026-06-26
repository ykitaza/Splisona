import { S3Client } from "@aws-sdk/client-s3";

export const IMAGE_BUCKET = process.env.IMAGE_BUCKET ?? "chorus-images-local";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
});
