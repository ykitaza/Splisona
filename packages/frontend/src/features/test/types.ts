export type ABTestStatus = "draft" | "running" | "completed" | "failed";

export const ABTEST_STATUS_LABELS: Record<ABTestStatus, string> = {
  draft: "下書き",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
};

export interface DesignInput {
  inputType: "image_upload" | "figma_url" | "site_url";
  imageKey?: string;
  figmaUrl?: string;
  siteUrl?: string;
}

export interface ABTest {
  testId: string;
  userId: string;
  title: string;
  status: ABTestStatus;
  designAInput: DesignInput;
  designBInput: DesignInput;
  personaIds: string[];
  focusPoints?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateABTestInput {
  title: string;
  designAInput: DesignInput;
  designBInput: DesignInput;
  personaIds: string[];
  focusPoints?: string;
}

export type UpdateABTestInput = Partial<CreateABTestInput>;

export interface UploadUrlRequest {
  side: "A" | "B";
  contentType: "image/png" | "image/jpeg" | "image/webp";
}

export type { UploadUrlResponse } from '@/shared/api/client';

export interface ProgressResponse {
  generationPhase?: 'generating' | 'generating_suggestions' | 'ready';
  total: number;
  completed: number;
  failed: number;
  status: ABTestStatus;
}
