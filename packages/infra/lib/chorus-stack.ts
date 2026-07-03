import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StorageConstruct } from "./storage-construct";
import { AuthConstruct } from "./auth-construct";
import { ApiConstruct } from "./api-construct";

export class ChorusStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const storage = new StorageConstruct(this, "Storage");

    const spaUrl = `https://${storage.spaDistribution.distributionDomainName}`;
    const imageCdnUrl = `https://${storage.imageDistribution.distributionDomainName}`;
    const localDevOrigin = "http://localhost:5173";

    const auth = new AuthConstruct(this, "Auth", { spaUrl });

    const api = new ApiConstruct(this, "Api", {
      storage,
      auth,
      imageCdnUrl,
      allowedOrigins: [spaUrl, localDevOrigin],
    });

    new CfnOutput(this, "ApiUrl", { value: api.api.apiEndpoint });
    new CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: auth.userPoolClient.userPoolClientId });
    new CfnOutput(this, "SpaUrl", { value: spaUrl });
    new CfnOutput(this, "ImageCdnUrl", { value: imageCdnUrl });
  }
}
