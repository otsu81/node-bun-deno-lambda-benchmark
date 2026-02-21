import { Duration, Stack, StackProps, CfnOutput } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";

interface BaseLambdaProps {
  memorySize?: number;
  timeout?: Duration;
  architecture?: lambda.Architecture;
  entry?: string;
}

const LAMBDA_DEFAULTS = {
  memorySize: 1024,
  timeout: Duration.seconds(10),
  architecture: lambda.Architecture.X86_64,
};

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
    const { handler, imagePath, file, cmdPrefix, ...rest } = props;
    const { memorySize, timeout, architecture } = {
      ...LAMBDA_DEFAULTS,
      ...rest,
    };

    this.fn = new lambda.DockerImageFunction(this, "Fn", {
      code: lambda.DockerImageCode.fromImageAsset(imagePath, {
        platform: Platform.LINUX_AMD64,
        cmd: [...cmdPrefix, handler],
        file,
      }),
      architecture,
      memorySize,
      timeout,
      environment: {
        AWS_LWA_READINESS_CHECK_PATH: "/",
        AWS_LWA_INVOKE_MODE: "buffered",
      },
    });
  }
}

class NodeLambda extends Construct {
  public readonly fn: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: BaseLambdaProps) {
    super(scope, id);
    const { entry, ...rest } = props;
    const { memorySize, timeout, architecture } = {
      ...LAMBDA_DEFAULTS,
      ...rest,
    };

    this.fn = new lambdaNodejs.NodejsFunction(this, "Fn", {
      entry,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture,
      memorySize,
      timeout,
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

  constructor(scope: Construct, id: string, props: BaseLambdaProps) {
    super(scope, id);
    const { entry, ...rest } = props;
    if (typeof entry !== "string") {
      throw new Error("entry point to lambda is not a string");
    }
    const { memorySize, timeout, architecture } = {
      ...LAMBDA_DEFAULTS,
      ...rest,
    };

    this.fn = new GoFunction(this, "Fn", {
      entry,
      architecture,
      memorySize,
      timeout,
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
  timeout: Duration.seconds(15),
};

export class NodeBunDenoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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

    new CfnOutput(this, "SignBunFunction", { value: sign.fn.functionArn });
    new CfnOutput(this, "ValidateBunFunction", {
      value: validate.fn.functionArn,
    });
    new CfnOutput(this, "JsonProcessBunFunction", {
      value: jsonProcess.fn.functionArn,
    });
    new CfnOutput(this, "CompressionBunFunction", {
      value: compression.fn.functionArn,
    });
    new CfnOutput(this, "ArrayOpsBunFunction", {
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

    new CfnOutput(this, "SignDenoFunction", {
      value: denoSign.fn.functionArn,
    });
    new CfnOutput(this, "ValidateDenoFunction", {
      value: denoValidate.fn.functionArn,
    });
    new CfnOutput(this, "JsonProcessDenoFunction", {
      value: denoJsonProcess.fn.functionArn,
    });
    new CfnOutput(this, "CompressionDenoFunction", {
      value: denoCompression.fn.functionArn,
    });
    new CfnOutput(this, "ArrayOpsDenoFunction", {
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

    new CfnOutput(this, "SignNodeFunction", {
      value: nodeSign.fn.functionArn,
    });
    new CfnOutput(this, "ValidateNodeFunction", {
      value: nodeValidate.fn.functionArn,
    });
    new CfnOutput(this, "JsonProcessNodeFunction", {
      value: nodeJsonProcess.fn.functionArn,
    });
    new CfnOutput(this, "CompressionNodeFunction", {
      value: nodeCompression.fn.functionArn,
    });
    new CfnOutput(this, "ArrayOpsNodeFunction", {
      value: nodeArrayOps.fn.functionArn,
    });

    new CfnOutput(this, "ArrayOpsGoFunction", {
      value: goArrayOps.fn.functionArn,
    });
  }
}
