import * as path from "path";
import { Duration } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { StorageConstruct } from "./storage-construct";
import { AuthConstruct } from "./auth-construct";

const BACKEND_SRC = path.join(__dirname, "../../backend/src");

interface ApiConstructProps {
  storage: StorageConstruct;
  auth: AuthConstruct;
}

export class ApiConstruct extends Construct {
  readonly api: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { storage, auth } = props;

    const commonEnv = {
      TABLE_NAME: storage.table.tableName,
      IMAGE_BUCKET: storage.imageBucket.bucketName,
      BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0",
    };

    const bedrockPolicy = new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: ["*"],
    });

    const mkFn = (
      id: string,
      entry: string,
      handler: string,
      overrides: Partial<{
        memorySize: number;
        timeout: Duration;
      }> = {}
    ) =>
      new NodejsFunction(this, id, {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry,
        handler,
        bundling: { minify: true, sourceMap: false },
        environment: commonEnv,
        memorySize: overrides.memorySize ?? 256,
        timeout: overrides.timeout ?? Duration.seconds(30),
      });

    // Persona Lambda functions
    const listPersonasLambda = mkFn("ListPersonasLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "listPersonas");
    const createPersonaLambda = mkFn("CreatePersonaLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "createPersona");
    const getPersonaLambda = mkFn("GetPersonaLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "getPersona");
    const updatePersonaLambda = mkFn("UpdatePersonaLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "updatePersona");
    const deletePersonaLambda = mkFn("DeletePersonaLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "deletePersona");
    const generateDraftLambda = mkFn("GenerateDraftLambda", path.join(BACKEND_SRC, "persona/handler.ts"), "generateDraft");

    for (const fn of [listPersonasLambda, createPersonaLambda, getPersonaLambda, updatePersonaLambda, deletePersonaLambda, generateDraftLambda]) {
      storage.table.grantReadWriteData(fn);
    }
    for (const fn of [generateDraftLambda]) {
      fn.addToRolePolicy(bedrockPolicy);
    }

    // Interview Lambda
    const interviewLambda = mkFn("InterviewLambda", path.join(BACKEND_SRC, "interview/handler.ts"), "interviewPersona");
    storage.table.grantReadWriteData(interviewLambda);
    interviewLambda.addToRolePolicy(bedrockPolicy);

    // ABTest Lambda functions
    const createTestLambda = mkFn("CreateTestLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "createTest");
    const listTestsLambda = mkFn("ListTestsLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "listTests");
    const getTestLambda = mkFn("GetTestLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "getTest");
    const updateTestLambda = mkFn("UpdateTestLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "updateTest");
    const getUploadUrlLambda = mkFn("GetUploadUrlLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "getUploadUrl");
    const getProgressLambda = mkFn("GetProgressLambda", path.join(BACKEND_SRC, "abtest/handler.ts"), "getProgress");

    for (const fn of [createTestLambda, listTestsLambda, getTestLambda, updateTestLambda, getUploadUrlLambda, getProgressLambda]) {
      storage.table.grantReadWriteData(fn);
    }
    storage.imageBucket.grantReadWrite(getUploadUrlLambda);

    // Evaluation Lambda
    const evalLambda = mkFn("EvalLambda", path.join(BACKEND_SRC, "evaluation/orchestrator.ts"), "executeTest", {
      memorySize: 512,
      timeout: Duration.minutes(15),
    });
    storage.table.grantReadWriteData(evalLambda);
    storage.imageBucket.grantReadWrite(evalLambda);
    evalLambda.addToRolePolicy(bedrockPolicy);

    // Report Lambda functions
    const getReportLambda = mkFn("GetReportLambda", path.join(BACKEND_SRC, "report/handler.ts"), "getReport");
    const exportReportLambda = mkFn("ExportReportLambda", path.join(BACKEND_SRC, "report/handler.ts"), "exportReport");
    for (const fn of [getReportLambda, exportReportLambda]) {
      storage.table.grantReadWriteData(fn);
    }

    // HTTP API
    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1"}.amazonaws.com/${auth.userPool.userPoolId}`,
      {
        jwtAudience: [auth.userPoolClient.userPoolClientId],
      }
    );

    this.api = new apigwv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["https://*.pages.dev", "http://localhost:5173"],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ["Content-Type", "Authorization"],
      },
      defaultAuthorizer: jwtAuthorizer,
    });

    const integ = (fn: lambda.IFunction) =>
      new integrations.HttpLambdaIntegration(`${fn.node.id}Integration`, fn);

    // Persona routes
    this.api.addRoutes({ path: "/personas", methods: [apigwv2.HttpMethod.GET], integration: integ(listPersonasLambda) });
    this.api.addRoutes({ path: "/personas", methods: [apigwv2.HttpMethod.POST], integration: integ(createPersonaLambda) });
    this.api.addRoutes({ path: "/personas/{id}", methods: [apigwv2.HttpMethod.GET], integration: integ(getPersonaLambda) });
    this.api.addRoutes({ path: "/personas/{id}", methods: [apigwv2.HttpMethod.PUT], integration: integ(updatePersonaLambda) });
    this.api.addRoutes({ path: "/personas/{id}", methods: [apigwv2.HttpMethod.DELETE], integration: integ(deletePersonaLambda) });
    this.api.addRoutes({ path: "/personas/{id}/draft", methods: [apigwv2.HttpMethod.POST], integration: integ(generateDraftLambda) });
    this.api.addRoutes({ path: "/personas/{id}/interview", methods: [apigwv2.HttpMethod.POST], integration: integ(interviewLambda) });

    // ABTest routes
    this.api.addRoutes({ path: "/tests", methods: [apigwv2.HttpMethod.POST], integration: integ(createTestLambda) });
    this.api.addRoutes({ path: "/tests", methods: [apigwv2.HttpMethod.GET], integration: integ(listTestsLambda) });
    this.api.addRoutes({ path: "/tests/{id}", methods: [apigwv2.HttpMethod.GET], integration: integ(getTestLambda) });
    this.api.addRoutes({ path: "/tests/{id}", methods: [apigwv2.HttpMethod.PUT], integration: integ(updateTestLambda) });
    this.api.addRoutes({ path: "/tests/{id}/upload-url", methods: [apigwv2.HttpMethod.POST], integration: integ(getUploadUrlLambda) });
    this.api.addRoutes({ path: "/tests/{id}/progress", methods: [apigwv2.HttpMethod.GET], integration: integ(getProgressLambda) });
    this.api.addRoutes({ path: "/tests/{id}/execute", methods: [apigwv2.HttpMethod.POST], integration: integ(evalLambda) });
    this.api.addRoutes({ path: "/tests/{id}/report", methods: [apigwv2.HttpMethod.GET], integration: integ(getReportLambda) });
    this.api.addRoutes({ path: "/tests/{id}/export", methods: [apigwv2.HttpMethod.GET], integration: integ(exportReportLambda) });
  }
}
