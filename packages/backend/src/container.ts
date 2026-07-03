import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3Client } from "@aws-sdk/client-s3";
import { createDynamoClient, DynamoOperations } from "./infra/aws/dynamo-client.js";
import { DynamoPersonaRepository } from "./infra/aws/dynamo-persona-repository.js";
import { DynamoABTestRepository } from "./infra/aws/dynamo-abtest-repository.js";
import { DynamoEvaluationRepository } from "./infra/aws/dynamo-evaluation-repository.js";
import { DynamoSettingsRepository } from "./infra/aws/dynamo-settings-repository.js";
import { BedrockAIService } from "./infra/aws/bedrock-ai-service.js";
import { S3StorageService } from "./infra/aws/s3-storage-service.js";
import { PersonaUseCases } from "./application/persona-use-cases.js";
import { ABTestUseCases } from "./application/abtest-use-cases.js";
import { InterviewUseCases } from "./application/interview-use-cases.js";
import { EvaluationUseCases } from "./application/evaluation-use-cases.js";
import { ReportUseCases } from "./application/report-use-cases.js";
import { SettingsUseCases } from "./application/settings-use-cases.js";
import { CaptureUseCases } from "./application/capture-use-cases.js";
import { ProjectUseCases } from "./application/project-use-cases.js";
import { ApiKeyUseCases } from "./application/api-key-use-cases.js";
import { MemoryApiKeyRepository } from "./infra/local/memory-repos.js";
import type { PersonaRepository } from "./domain/ports/persona-repository.js";
import type { ABTestRepository } from "./domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "./domain/ports/evaluation-repository.js";
import type { SettingsRepository } from "./domain/ports/settings-repository.js";
import type { ProjectRepository } from "./domain/ports/project-repository.js";
import type { ApiKeyRepository } from "./domain/ports/api-key-repository.js";
import type { AIService } from "./domain/ports/ai-service.js";
import type { StorageService } from "./domain/ports/storage-service.js";

export interface AppContainer {
  personaRepo: PersonaRepository;
  testRepo: ABTestRepository;
  evalRepo: EvaluationRepository;
  settingsRepo: SettingsRepository;
  projectRepo: ProjectRepository;
  apiKeyRepo: ApiKeyRepository;
  aiService: AIService;
  storageService: StorageService;

  personaUseCases: PersonaUseCases;
  abtestUseCases: ABTestUseCases;
  interviewUseCases: InterviewUseCases;
  evaluationUseCases: EvaluationUseCases;
  reportUseCases: ReportUseCases;
  settingsUseCases: SettingsUseCases;
  captureUseCases: CaptureUseCases;
  projectUseCases: ProjectUseCases;
  apiKeyUseCases: ApiKeyUseCases;

  imageBucket: string;
  modelId: string;
}

export interface ContainerConfig {
  tableName?: string;
  imageBucket?: string;
  modelId?: string;
  region?: string;
  s3Endpoint?: string;
  personaRepo?: PersonaRepository;
  testRepo?: ABTestRepository;
  evalRepo?: EvaluationRepository;
  settingsRepo?: SettingsRepository;
  projectRepo?: ProjectRepository;
  apiKeyRepo?: ApiKeyRepository;
  aiService?: AIService;
  storageService?: StorageService;
  captureFigmaNode?: (url: string, token: string) => Promise<Buffer>;
  captureWebsite?: (url: string) => Promise<{ full: Buffer; segments: Buffer[] }>;
}

export function createContainer(config: ContainerConfig = {}): AppContainer {
  const tableName = config.tableName ?? process.env.TABLE_NAME ?? "chorus-main";
  const imageBucket = config.imageBucket ?? process.env.IMAGE_BUCKET ?? "chorus-images-local";
  const modelId = config.modelId ?? process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";
  const region = config.region ?? process.env.AWS_REGION ?? "us-east-1";
  const s3Endpoint = config.s3Endpoint ?? process.env.S3_ENDPOINT;

  const docClient = createDynamoClient();
  const db = new DynamoOperations(docClient, tableName);

  const personaRepo = config.personaRepo ?? new DynamoPersonaRepository(db);
  const testRepo = config.testRepo ?? new DynamoABTestRepository(db);
  const evalRepo = config.evalRepo ?? new DynamoEvaluationRepository(db);
  const settingsRepo = config.settingsRepo ?? new DynamoSettingsRepository(db);
  const projectRepo = config.projectRepo ?? new Proxy({} as ProjectRepository, {
    get: () => () => { throw new Error("ProjectRepository not configured"); },
  });
  // AWS/Dynamo 実装は未対応のため、デフォルトはインメモリ実装を使う
  const apiKeyRepo = config.apiKeyRepo ?? new MemoryApiKeyRepository();

  const aiService = config.aiService ?? new BedrockAIService(
    new BedrockRuntimeClient({ region }), modelId,
  );

  const storageService = config.storageService ?? new S3StorageService(
    new S3Client({
      region,
      ...(s3Endpoint ? { endpoint: s3Endpoint, forcePathStyle: true } : {}),
    }),
    imageBucket, region, s3Endpoint,
  );

  const personaUseCases = new PersonaUseCases(personaRepo, settingsRepo, aiService, storageService);
  const abtestUseCases = new ABTestUseCases(testRepo, evalRepo, storageService);
  const interviewUseCases = new InterviewUseCases(personaRepo, settingsRepo, aiService);
  const evaluationUseCases = new EvaluationUseCases(testRepo, evalRepo, personaRepo, settingsRepo, projectRepo, aiService, imageBucket);
  const reportUseCases = new ReportUseCases(testRepo, evalRepo);
  const settingsUseCases = new SettingsUseCases(settingsRepo);
  const projectUseCases = new ProjectUseCases(projectRepo, testRepo);
  const apiKeyUseCases = new ApiKeyUseCases(apiKeyRepo);

  const captureFigmaNode = config.captureFigmaNode ?? (async () => { throw new Error("Figma capture not configured"); });
  const captureWebsite = config.captureWebsite ?? (async () => { throw new Error("Website capture not configured"); });
  const captureUseCases = new CaptureUseCases(storageService, captureFigmaNode, captureWebsite);

  return {
    personaRepo,
    testRepo,
    evalRepo,
    settingsRepo,
    projectRepo,
    apiKeyRepo,
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
    apiKeyUseCases,
    imageBucket,
    modelId,
  };
}
