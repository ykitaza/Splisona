import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class StorageConstruct extends Construct {
  readonly table: dynamodb.Table;
  readonly imageBucket: s3.Bucket;
  readonly spaBucket: s3.Bucket;
  readonly spaDistribution: cloudfront.Distribution;
  readonly imageDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "Table", {
      tableName: "chorus-main",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.imageBucket = new s3.Bucket(this, "ImageBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.imageDistribution = new cloudfront.Distribution(
      this,
      "ImageDistribution",
      {
        defaultBehavior: {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(this.imageBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      }
    );

    this.spaBucket = new s3.Bucket(this, "SpaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.spaDistribution = new cloudfront.Distribution(
      this,
      "SpaDistribution",
      {
        defaultBehavior: {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(this.spaBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );
  }
}
