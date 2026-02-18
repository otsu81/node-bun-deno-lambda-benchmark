import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";

interface LambdaProps {
  handler: string;
  memorySize?: number;
  timeout?: cdk.Duration;
}

class BunLambda extends Construct {
  public readonly fn: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: LambdaProps) {
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

class DenoLambda extends Construct {
  public readonly fn: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    this.fn = new lambda.DockerImageFunction(this, "Fn", {
      code: lambda.DockerImageCode.fromImageAsset("src/deno", {
        platform: Platform.LINUX_AMD64,
        cmd: ["deno", "run", "--allow-all", props.handler],
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(15),
      environment: {
        AWS_LWA_READINESS_CHECK_PATH: "/",
        AWS_LWA_INVOKE_MODE: "buffered",
      },
    });
  }
}

class NodeLambda extends Construct {
  public readonly fn: lambdaNodejs.NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: { entry: string; memorySize?: number; timeout?: cdk.Duration },
  ) {
    super(scope, id);

    this.fn = new lambdaNodejs.NodejsFunction(this, "Fn", {
      entry: props.entry,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(3),
      depsLockFilePath: path.join(__dirname, "../package-lock.json"),
      bundling: {
        minify: true,
        sourceMap: false,
        target: "node24",
        externalModules: [],
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

    // Deno lambdas
    const denoSign = new DenoLambda(this, "DenoJwtSign", {
      handler: "jwtSign/index.ts",
    });
    const denoValidate = new DenoLambda(this, "DenoJwtValidate", {
      handler: "jwtValidate/index.ts",
    });
    const denoJsonProcess = new DenoLambda(this, "DenoJsonProcess", {
      handler: "jsonProcess/index.ts",
    });
    const denoCompression = new DenoLambda(this, "DenoCompression", {
      handler: "compression/index.ts",
    });
    const denoArrayOps = new DenoLambda(this, "DenoArrayOps", {
      handler: "arrayOps/index.ts",
    });

    // Chain dependencies to avoid IAM race condition
    denoValidate.node.addDependency(denoSign);
    denoJsonProcess.node.addDependency(denoValidate);
    denoCompression.node.addDependency(denoJsonProcess);
    denoArrayOps.node.addDependency(denoCompression);

    new cdk.CfnOutput(this, "SignDenoFunction", {
      value: denoSign.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ValidateDenoFunction", {
      value: denoValidate.fn.functionArn,
    });
    new cdk.CfnOutput(this, "JsonProcessDenoFunction", {
      value: denoJsonProcess.fn.functionArn,
    });
    new cdk.CfnOutput(this, "CompressionDenoFunction", {
      value: denoCompression.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ArrayOpsDenoFunction", {
      value: denoArrayOps.fn.functionArn,
    });

    // Node.js managed runtime lambdas
    const nodeSign = new NodeLambda(this, "NodeJwtSign", {
      entry: path.join(__dirname, "../src/node/jwtSign/index.ts"),
    });
    const nodeValidate = new NodeLambda(this, "NodeJwtValidate", {
      entry: path.join(__dirname, "../src/node/jwtValidate/index.ts"),
    });
    const nodeJsonProcess = new NodeLambda(this, "NodeJsonProcess", {
      entry: path.join(__dirname, "../src/node/jsonProcess/index.ts"),
    });
    const nodeCompression = new NodeLambda(this, "NodeCompression", {
      entry: path.join(__dirname, "../src/node/compression/index.ts"),
    });
    const nodeArrayOps = new NodeLambda(this, "NodeArrayOps", {
      entry: path.join(__dirname, "../src/node/arrayOps/index.ts"),
    });

    nodeValidate.node.addDependency(nodeSign);
    nodeJsonProcess.node.addDependency(nodeValidate);
    nodeCompression.node.addDependency(nodeJsonProcess);
    nodeArrayOps.node.addDependency(nodeCompression);

    new cdk.CfnOutput(this, "SignNodeFunction", { value: nodeSign.fn.functionArn });
    new cdk.CfnOutput(this, "ValidateNodeFunction", { value: nodeValidate.fn.functionArn });
    new cdk.CfnOutput(this, "JsonProcessNodeFunction", { value: nodeJsonProcess.fn.functionArn });
    new cdk.CfnOutput(this, "CompressionNodeFunction", { value: nodeCompression.fn.functionArn });
    new cdk.CfnOutput(this, "ArrayOpsNodeFunction", { value: nodeArrayOps.fn.functionArn });
  }
}
