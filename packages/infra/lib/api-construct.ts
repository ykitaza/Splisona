import * as path from "path";
import { ArnFormat, Duration, Stack } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { StorageConstruct } from "./storage-construct";
import { AuthConstruct } from "./auth-construct";

// バックエンドはHonoで書かれた単一アプリで、Lambdaエントリはpackages/backend/src/lambda.ts。
const BACKEND_SRC = path.join(__dirname, "../../backend/src");

interface ApiConstructProps {
  storage: StorageConstruct;
  auth: AuthConstruct;
  // 画像配信CloudFrontのURL。バックエンドが画像URLを組み立てる際に使う。
  imageCdnUrl: string;
  // SPA配信CloudFrontのURLとローカル開発オリジン。CORS許可オリジンに使う。
  allowedOrigins: string[];
}

export class ApiConstruct extends Construct {
  readonly api: apigwv2.HttpApi;
  readonly fn: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { storage, auth, imageCdnUrl, allowedOrigins } = props;

    // Honoアプリを1つのLambda関数に丸ごとデプロイする（per-routeのLambda分割はしない）。
    // ルーティングはHono側で行うため、API Gateway側は $default で全リクエストをこの関数に委譲する。
    this.fn = new NodejsFunction(this, "ApiFunction", {
      entry: path.join(BACKEND_SRC, "lambda.ts"),
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      // 評価実行（Bedrock呼び出しを伴うAB評価）が長時間かかるためタイムアウトを長めに取る。
      timeout: Duration.minutes(15),
      bundling: {
        // hono/aws-lambda等のパッケージ構成に合わせCJSでバンドルする。
        format: OutputFormat.CJS,
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        TABLE_NAME: storage.table.tableName,
        IMAGE_BUCKET: storage.imageBucket.bucketName,
        // 旧nova-liteは廃止。Claude Haiku 4.5をデフォルトモデルとする。
        BEDROCK_MODEL_ID: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        COGNITO_USER_POOL_ID: auth.userPool.userPoolId,
        COGNITO_CLIENT_ID: auth.userPoolClient.userPoolClientId,
        IMAGE_CDN_URL: imageCdnUrl,
      },
    });

    // DynamoDBとS3（画像バケット）への読み書き権限。
    storage.table.grantReadWriteData(this.fn);
    storage.imageBucket.grantReadWrite(this.fn);

    // AB評価でBedrockモデルを呼び出すための権限。モデルIDを環境変数で切り替えられるようにresourceは*にする。
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );

    // AB評価は時間がかかるため、リクエストを受けたLambdaが自分自身を非同期(Event)呼び出しして
    // バックグラウンド実行する構成を取っている。関数自身のARNを参照すると
    // 「関数定義 → IAMポリシー → 関数定義」の循環参照になってしまうため、
    // resourceはワイルドカードの関数名で許可することで循環を避ける。
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [
          Stack.of(this).formatArn({
            service: "lambda",
            resource: "function",
            resourceName: "*",
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          }),
        ],
      })
    );

    // HTTP API。認証はアプリ内（HonoのミドルウェアでBearer APIキー/Cognito JWTを検証）で行うため
    // API Gateway側にauthorizerは付けない。/share/:token は認証不要の公開ルートであり、
    // authorizerを一律に付けると公開ルートまで弾かれてしまうための判断。
    // defaultIntegrationを指定することで$defaultルート（全パス・全メソッド）を
    // この1つのLambda関数へプロキシする。
    this.api = new apigwv2.HttpApi(this, "HttpApi", {
      defaultIntegration: new integrations.HttpLambdaIntegration("DefaultIntegration", this.fn),
      corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ["content-type", "authorization", "x-local-user-id"],
      },
    });
  }
}
