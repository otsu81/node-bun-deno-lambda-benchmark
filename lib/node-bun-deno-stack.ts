import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";

interface BaseLambdaProps {
  memorySize?: number;
  timeout?: cdk.Duration;
}

interface ContainerLambdaProps extends BaseLambdaProps {
  handler: string;
  imagePath: string;
  file: string;
  cmdPrefix: string[];
}

class ContainerLambda extends Construct {
  public readonly fn: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: ContainerLambdaProps) {
    super(scope, id);

    this.fn = new lambda.DockerImageFunction(this, "Fn", {
      code: lambda.DockerImageCode.fromImageAsset(props.imagePath, {
        platform: Platform.LINUX_AMD64,
        cmd: [...props.cmdPrefix, props.handler],
        file: props.file,
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(10), // Default from Bun ex
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
      timeout: props.timeout ?? cdk.Duration.seconds(10),
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

class GoLambda extends Construct {
  public readonly fn: GoFunction;
  constructor(
    scope: Construct,
    id: string,
    props: { entry: string; memorySize?: number; timeout?: cdk.Duration },
  ) {
    super(scope, id);
    this.fn = new GoFunction(this, "Fn", {
      entry: props.entry,
      architecture: lambda.Architecture.X86_64,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(10),
    });
  }
}

const baseBunProps = {
  imagePath: "src",
  file: "bun/Dockerfile",
  cmdPrefix: ["bun"],
};

const baseDenoProps = {
  imagePath: "src",
  file: "deno/Dockerfile",
  cmdPrefix: ["deno", "run", "--allow-all"],
  timeout: cdk.Duration.seconds(15),
};

export class NodeBunDenoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sign = new ContainerLambda(this, "BunJwtSign", {
      ...baseBunProps,
      handler: "dist/jwtSign.js",
    });
    const validate = new ContainerLambda(this, "BunJwtValidate", {
      ...baseBunProps,
      handler: "dist/jwtValidate.js",
    });
    const jsonProcess = new ContainerLambda(this, "BunJsonProcess", {
      ...baseBunProps,
      handler: "dist/jsonProcess.js",
    });
    const compression = new ContainerLambda(this, "BunCompression", {
      ...baseBunProps,
      handler: "dist/compression.js",
    });
    const arrayOps = new ContainerLambda(this, "BunArrayOps", {
      ...baseBunProps,
      handler: "dist/arrayOps.js",
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
    const denoSign = new ContainerLambda(this, "DenoJwtSign", {
      ...baseDenoProps,
      handler: "jwtSign/index.ts",
    });
    const denoValidate = new ContainerLambda(this, "DenoJwtValidate", {
      ...baseDenoProps,
      handler: "jwtValidate/index.ts",
    });
    const denoJsonProcess = new ContainerLambda(this, "DenoJsonProcess", {
      ...baseDenoProps,
      handler: "jsonProcess/index.ts",
    });
    const denoCompression = new ContainerLambda(this, "DenoCompression", {
      ...baseDenoProps,
      handler: "compression/index.ts",
    });
    const denoArrayOps = new ContainerLambda(this, "DenoArrayOps", {
      ...baseDenoProps,
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

    const goArrayOps = new GoLambda(this, "GoArrayOps", {
      entry: path.join(__dirname, "../src/go/arrayOps"),
    });

    new cdk.CfnOutput(this, "SignNodeFunction", {
      value: nodeSign.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ValidateNodeFunction", {
      value: nodeValidate.fn.functionArn,
    });
    new cdk.CfnOutput(this, "JsonProcessNodeFunction", {
      value: nodeJsonProcess.fn.functionArn,
    });
    new cdk.CfnOutput(this, "CompressionNodeFunction", {
      value: nodeCompression.fn.functionArn,
    });
    new cdk.CfnOutput(this, "ArrayOpsNodeFunction", {
      value: nodeArrayOps.fn.functionArn,
    });

    new cdk.CfnOutput(this, "ArrayOpsGoFunction", {
      value: goArrayOps.fn.functionArn,
    });
  }
}
