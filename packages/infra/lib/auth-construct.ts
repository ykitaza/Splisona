import { CfnOutput, Duration } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class AuthConstruct extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: false,
        requireLowercase: false,
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
      },
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    new CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
