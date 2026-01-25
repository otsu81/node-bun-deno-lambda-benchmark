import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";

interface BunLambdaProps {
  handler: string;
  memorySize?: number;
  timeout?: cdk.Duration;
}

class BunLambda extends Construct {
  public readonly fn: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: BunLambdaProps) {
    super(scope, id);

    this.fn = new lambda.DockerImageFunction(this, "Fn", {
      code: lambda.DockerImageCode.fromImageAsset("src/bun", {
        platform: Platform.LINUX_AMD64,
        cmd: ["bun", props.handler],
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(3),
      environment: {
        AWS_LWA_READINESS_CHECK_PATH: "/",
        AWS_LWA_INVOKE_MODE: "buffered",
      },
    });
  }
}

export class NodeBunDenoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sign = new BunLambda(this, "BunJwtSign", {
      handler: "jwtSign/index.ts",
    });
    const validate = new BunLambda(this, "BunJwtValidate", {
      handler: "jwtValidate/index.ts",
    });

    validate.node.addDependency(sign);

    new cdk.CfnOutput(this, "SignBunFunction", {
      value: sign.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ValidateBunFunction", {
      value: validate.fn.functionArn,
    });
  }
}
