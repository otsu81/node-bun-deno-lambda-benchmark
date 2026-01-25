import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";

export class NodeBunDenoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.DockerImageFunction(this, "BunLambda", {
      code: lambda.DockerImageCode.fromImageAsset("src/bun", {
        platform: Platform.LINUX_AMD64,
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        AWS_LWA_READINESS_CHECK_PATH: "/",
        AWS_LWA_INVOKE_MODE: "buffered",
      },
    });
  }
}
