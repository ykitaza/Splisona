import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StorageConstruct } from "./storage-construct";
import { AuthConstruct } from "./auth-construct";
import { ApiConstruct } from "./api-construct";

export class ChorusStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const storage = new StorageConstruct(this, "Storage");
    const auth = new AuthConstruct(this, "Auth");
    new ApiConstruct(this, "Api", { storage, auth });
  }
}
