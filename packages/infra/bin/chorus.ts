import * as cdk from "aws-cdk-lib";
import { ChorusStack } from "../lib/chorus-stack";

const app = new cdk.App();
new ChorusStack(app, "ChorusStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
});
