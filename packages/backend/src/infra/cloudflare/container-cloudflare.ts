import { D1PersonaRepository } from "./d1-persona-repository.js";
import { D1ABTestRepository } from "./d1-abtest-repository.js";
import { D1EvaluationRepository } from "./d1-evaluation-repository.js";
import { D1SettingsRepository } from "./d1-settings-repository.js";
import { D1ProjectRepository } from "./d1-project-repository.js";
import { GeminiAIService } from "./gemini-ai-service.js";
import { R2StorageService, type R2Bucket } from "./r2-storage-service.js";
import { PersonaUseCases } from "../../application/persona-use-cases.js";
import { ABTestUseCases } from "../../application/abtest-use-cases.js";
import { InterviewUseCases } from "../../application/interview-use-cases.js";
import { EvaluationUseCases } from "../../application/evaluation-use-cases.js";
import { ReportUseCases } from "../../application/report-use-cases.js";
import { SettingsUseCases } from "../../application/settings-use-cases.js";
import { CaptureUseCases } from "../../application/capture-use-cases.js";
import { ProjectUseCases } from "../../application/project-use-cases.js";
import type { AppContainer } from "../../container.js";
import type { D1Database } from "./d1-types.js";

export interface CloudflareEnv {
  DB: D1Database;
  IMAGES: {
    put(key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    get(key: string): Promise<unknown>;
  };
  GEMINI_API_KEY: string;
  GEMINI_MODEL_ID?: string;
  PUBLIC_IMAGE_URL?: string;
  WORKER_URL?: string;
}

export function createCloudflareContainer(env: CloudflareEnv): AppContainer {
  const modelId = env.GEMINI_MODEL_ID ?? "gemini-2.5-flash";
  const publicImageUrl = env.PUBLIC_IMAGE_URL ?? "";
  const workerUrl = env.WORKER_URL ?? "";

  const personaRepo = new D1PersonaRepository(env.DB);
  const testRepo = new D1ABTestRepository(env.DB);
  const evalRepo = new D1EvaluationRepository(env.DB);
  const settingsRepo = new D1SettingsRepository(env.DB);
  const aiService = new GeminiAIService(env.GEMINI_API_KEY, modelId);
  const storageService = new R2StorageService(env.IMAGES as R2Bucket, publicImageUrl, workerUrl);

  const personaUseCases = new PersonaUseCases(personaRepo, settingsRepo, aiService, storageService);
  const abtestUseCases = new ABTestUseCases(testRepo, evalRepo, storageService);
  const interviewUseCases = new InterviewUseCases(personaRepo, settingsRepo, aiService);
  const evaluationUseCases = new EvaluationUseCases(testRepo, evalRepo, personaRepo, settingsRepo, aiService, "");
  const reportUseCases = new ReportUseCases(testRepo, evalRepo);
  const settingsUseCases = new SettingsUseCases(settingsRepo);
  const captureUseCases = new CaptureUseCases(
    storageService,
    async () => { throw new Error("Figma capture not supported on Workers"); },
    async () => { throw new Error("Website capture not supported on Workers"); },
  );

  const projectRepo = new D1ProjectRepository(env.DB);
  const projectUseCases = new ProjectUseCases(projectRepo, testRepo);

  return {
    personaRepo,
    testRepo,
    evalRepo,
    settingsRepo,
    projectRepo,
    aiService,
    storageService,
    personaUseCases,
    abtestUseCases,
    interviewUseCases,
    evaluationUseCases,
    reportUseCases,
    settingsUseCases,
    captureUseCases,
    projectUseCases,
    imageBucket: "",
    modelId,
  };
}
