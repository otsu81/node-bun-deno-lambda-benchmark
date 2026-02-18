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
    const jsonProcess = new BunLambda(this, "BunJsonProcess", {
      handler: "jsonProcess/index.ts",
    });
    const compression = new BunLambda(this, "BunCompression", {
      handler: "compression/index.ts",
    });
    const arrayOps = new BunLambda(this, "BunArrayOps", {
      handler: "arrayOps/index.ts",
    });

    // Chain dependencies to avoid IAM race condition
    validate.node.addDependency(sign);
    jsonProcess.node.addDependency(validate);
    compression.node.addDependency(jsonProcess);
    arrayOps.node.addDependency(compression);

    new cdk.CfnOutput(this, "SignBunFunction", { value: sign.fn.functionArn });
    new cdk.CfnOutput(this, "ValidateBunFunction", {
      value: validate.fn.functionArn,
    });
    new cdk.CfnOutput(this, "JsonProcessBunFunction", {
      value: jsonProcess.fn.functionArn,
    });
    new cdk.CfnOutput(this, "CompressionBunFunction", {
      value: compression.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ArrayOpsBunFunction", {
      value: arrayOps.fn.functionArn,
    });
  }
}
