import crypto from "node:crypto";
import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import type { StorageService } from "../domain/ports/storage-service.js";
import type { ABTest, UploadUrlResult } from "../domain/types.js";
import { NotFoundError } from "./errors.js";

export class ABTestUseCases {
  constructor(
    private readonly testRepo: ABTestRepository,
    private readonly evalRepo: EvaluationRepository,
    private readonly storageService: StorageService,
  ) {}

  async create(userId: string, input: {
    title: string;
    designAInput?: { inputType?: string; imageKey?: string; figmaUrl?: string; siteUrl?: string };
    designBInput?: { inputType?: string; imageKey?: string; figmaUrl?: string; siteUrl?: string };
    designAInputType?: string;
    designBInputType?: string;
    designAImageKey?: string;
    designBImageKey?: string;
    personaIds?: string[];
  }): Promise<ABTest> {
    const testId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dA = input.designAInput ?? {};
    const dB = input.designBInput ?? {};
    const test: ABTest = {
      testId,
      userId,
      title: input.title,
      status: "draft",
      designAInputType: (dA.inputType ?? input.designAInputType ?? "image_upload") as ABTest["designAInputType"],
      designBInputType: (dB.inputType ?? input.designBInputType ?? "image_upload") as ABTest["designBInputType"],
      designAImageKey: dA.imageKey ?? input.designAImageKey,
      designBImageKey: dB.imageKey ?? input.designBImageKey,
      designAUrl: dA.figmaUrl ?? dA.siteUrl,
      designBUrl: dB.figmaUrl ?? dB.siteUrl,
      personaIds: input.personaIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await this.testRepo.save(test);
    return test;
  }

  async list(userId: string): Promise<ABTest[]> {
    return this.testRepo.findAllByUser(userId);
  }

  async get(userId: string, testId: string): Promise<ABTest | undefined> {
    return this.testRepo.findById(userId, testId);
  }

  async update(userId: string, testId: string, input: {
    title?: string;
    designAInput?: { inputType?: string; imageKey?: string; figmaUrl?: string; siteUrl?: string };
    designBInput?: { inputType?: string; imageKey?: string; figmaUrl?: string; siteUrl?: string };
    designAInputType?: string;
    designBInputType?: string;
    designAImageKey?: string;
    designBImageKey?: string;
    personaIds?: string[];
  }): Promise<ABTest> {
    const existing = await this.testRepo.findById(userId, testId);
    if (!existing) throw new NotFoundError("ABTest");

    const dA = input.designAInput ?? {};
    const dB = input.designBInput ?? {};
    const now = new Date().toISOString();
    const updated: ABTest = {
      ...existing,
      ...Object.fromEntries(
        Object.entries({
          title: input.title,
          designAInputType: dA.inputType ?? input.designAInputType,
          designBInputType: dB.inputType ?? input.designBInputType,
          designAImageKey: dA.imageKey ?? input.designAImageKey,
          designBImageKey: dB.imageKey ?? input.designBImageKey,
          designAUrl: dA.figmaUrl ?? dA.siteUrl,
          designBUrl: dB.figmaUrl ?? dB.siteUrl,
          personaIds: input.personaIds,
        }).filter(([, v]) => v !== undefined)
      ),
      updatedAt: now,
    };
    await this.testRepo.save(updated);
    return updated;
  }

  async delete(userId: string, testId: string): Promise<void> {
    await this.testRepo.remove(userId, testId);
  }

  async getUploadUrl(userId: string, testId: string, side: string, contentType: string): Promise<UploadUrlResult> {
    const existing = await this.testRepo.findById(userId, testId);
    if (!existing) throw new NotFoundError("ABTest");

    const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    const imageKey = `${userId}/${testId}/${side}.${ext}`;
    return this.storageService.getUploadUrl(imageKey, contentType);
  }

  async clone(userId: string, testId: string): Promise<ABTest> {
    const existing = await this.testRepo.findById(userId, testId);
    if (!existing) throw new NotFoundError("ABTest");

    const newTestId = crypto.randomUUID();
    const now = new Date().toISOString();

    let newImageKeyA = existing.designAImageKey;
    let newImageKeyB = existing.designBImageKey;

    if (this.storageService.copyObject) {
      if (existing.designAImageKey) {
        const ext = existing.designAImageKey.split('.').pop() ?? 'png';
        newImageKeyA = `${userId}/${newTestId}/A.${ext}`;
        await this.storageService.copyObject(existing.designAImageKey, newImageKeyA);
      }
      if (existing.designBImageKey) {
        const ext = existing.designBImageKey.split('.').pop() ?? 'png';
        newImageKeyB = `${userId}/${newTestId}/B.${ext}`;
        await this.storageService.copyObject(existing.designBImageKey, newImageKeyB);
      }
    }

    const d = new Date();
    const autoTitle = `A/B テスト ${d.getMonth() + 1}/${d.getDate()}`;

    const cloned: ABTest = {
      ...existing,
      testId: newTestId,
      title: autoTitle,
      status: "draft",
      designAImageKey: newImageKeyA,
      designBImageKey: newImageKeyB,
      reasonSummaryA: undefined,
      reasonSummaryB: undefined,
      winnersReasonSummary: undefined,
      reasonSummaryStatus: undefined,
      createdAt: now,
      updatedAt: now,
    };
    await this.testRepo.save(cloned);
    return cloned;
  }

  async getProgress(userId: string, testId: string): Promise<{
    total: number; completed: number; failed: number; status: string;
  }> {
    const test = await this.testRepo.findById(userId, testId);
    if (!test) throw new NotFoundError("ABTest");

    const evaluations = await this.evalRepo.findAllByTest(testId);
    const completed = evaluations.filter((e) => e.status === "completed").length;
    const failed = evaluations.filter((e) => e.status === "failed").length;

    return { total: test.personaIds.length, completed, failed, status: test.status };
  }
}
