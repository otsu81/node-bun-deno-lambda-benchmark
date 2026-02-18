import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import jwtPayloads from "../fakerdata/generatedJson/jwtPayloads.json";
import compressionData from "../fakerdata/generatedJson/compressionData.json";
import largeJson from "../fakerdata/generatedJson/largeJson.json";

const {
  SignBunFunction,
  ValidateBunFunction,
  JsonProcessBunFunction,
  CompressionBunFunction,
  ArrayOpsBunFunction,
} = process.env;

const lambda = new LambdaClient({});

async function invoke(
  functionName: string,
  payload: unknown,
): Promise<unknown> {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambda.send(command);

  if (response.FunctionError) {
    const errorPayload = Buffer.from(response.Payload!).toString();
    throw new Error(
      `Lambda error: ${response.FunctionError} - ${errorPayload}`,
    );
  }

  return JSON.parse(Buffer.from(response.Payload!).toString());
}

async function benchmarkJwt(iterations: number) {
  if (!SignBunFunction || !ValidateBunFunction) {
    console.log("Skipping JWT benchmark - functions not configured");
    return;
  }

  console.log(`\n=== JWT Sign/Validate (${iterations} iterations) ===`);

  for (let i = 0; i < iterations; i++) {
    const payload = jwtPayloads[i % jwtPayloads.length];
    const signResult = await invoke(SignBunFunction, payload);
    await invoke(ValidateBunFunction, signResult);

    if ((i + 1) % 10 === 0) console.log(`JWT: ${i + 1}/${iterations}`);
  }
}

async function benchmarkJsonProcess(iterations: number) {
  if (!JsonProcessBunFunction) {
    console.log("Skipping JSON benchmark - function not configured");
    return;
  }

  console.log(`\n=== JSON Process (${iterations} iterations) ===`);

  const payload = { raw: JSON.stringify(largeJson) };

  for (let i = 0; i < iterations; i++) {
    const result = await invoke(JsonProcessBunFunction, payload);
    if ((i + 1) % 10 === 0) console.log(`JSON: ${i + 1}/${iterations}`, result);
  }
}

async function benchmarkCompression(iterations: number) {
  if (!CompressionBunFunction) {
    console.log("Skipping compression benchmark - function not configured");
    return;
  }

  console.log(`\n=== Compression (${iterations} iterations) ===`);

  for (let i = 0; i < iterations; i++) {
    const result = await invoke(CompressionBunFunction, compressionData);
    if ((i + 1) % 10 === 0)
      console.log(`Compression: ${i + 1}/${iterations}`, result);
  }
}

async function benchmarkArrayOps(iterations: number) {
  if (!ArrayOpsBunFunction) {
    console.log("Skipping array ops benchmark - function not configured");
    return;
  }

  console.log(`\n=== Array Operations (${iterations} iterations) ===`);

  for (let i = 0; i < iterations; i++) {
    const result = await invoke(ArrayOpsBunFunction, { size: 100000, seed: i });
    if ((i + 1) % 10 === 0)
      console.log(`ArrayOps: ${i + 1}/${iterations}`, result);
  }
}

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || "50", 10);

  console.log("Starting benchmark suite");
  console.log(`Iterations per benchmark: ${iterations}`);

  await benchmarkJwt(iterations);
  await benchmarkJsonProcess(iterations);
  await benchmarkCompression(iterations);
  await benchmarkArrayOps(iterations);

  console.log("\n=== Benchmark complete ===");
}

main().catch(console.error);
