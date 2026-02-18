import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import jwtPayloads from "../fakerdata/generatedJson/jwtPayloads.json";
import compressionData from "../fakerdata/generatedJson/compressionData.json";
import largeJson from "../fakerdata/generatedJson/largeJson.json";

const VALID_RUNTIMES = ["bun", "deno", "nodejs"] as const;
type Runtime = (typeof VALID_RUNTIMES)[number];

interface RuntimeConfig {
  signFn?: string;
  validateFn?: string;
  jsonProcessFn?: string;
  compressionFn?: string;
  arrayOpsFn?: string;
}

const configs: Partial<Record<Runtime, RuntimeConfig>> = {
  bun: {
    signFn: process.env.SignBunFunction,
    validateFn: process.env.ValidateBunFunction,
    jsonProcessFn: process.env.JsonProcessBunFunction,
    compressionFn: process.env.CompressionBunFunction,
    arrayOpsFn: process.env.ArrayOpsBunFunction,
  },
  deno: {
    signFn: process.env.SignDenoFunction,
    validateFn: process.env.ValidateDenoFunction,
    jsonProcessFn: process.env.JsonProcessDenoFunction,
    compressionFn: process.env.CompressionDenoFunction,
    arrayOpsFn: process.env.ArrayOpsDenoFunction,
  },
  nodejs: {
    signFn: process.env.SignNodeFunction,
    validateFn: process.env.ValidateNodeFunction,
    jsonProcessFn: process.env.JsonProcessNodeFunction,
    compressionFn: process.env.CompressionNodeFunction,
    arrayOpsFn: process.env.ArrayOpsNodeFunction,
  },
};

const lambda = new LambdaClient({});

async function invoke(functionName: string, payload: unknown): Promise<unknown> {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambda.send(command);

  if (response.FunctionError) {
    const errorPayload = Buffer.from(response.Payload!).toString();
    throw new Error(`Lambda error: ${response.FunctionError} - ${errorPayload}`);
  }

  return JSON.parse(Buffer.from(response.Payload!).toString());
}

async function runJwt(runtime: Runtime, iterations: number): Promise<number | null> {
  const cfg = configs[runtime];
  if (!cfg?.signFn || !cfg.validateFn) {
    console.log(`  [${runtime}] skipping - not configured`);
    return null;
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const payload = jwtPayloads[i % jwtPayloads.length];
    const signResult = await invoke(cfg.signFn, payload);
    await invoke(cfg.validateFn, signResult);
    if ((i + 1) % 10 === 0) console.log(`  [${runtime}] JWT: ${i + 1}/${iterations}`);
  }
  return performance.now() - start;
}

async function runJsonProcess(runtime: Runtime, iterations: number): Promise<number | null> {
  const cfg = configs[runtime];
  if (!cfg?.jsonProcessFn) {
    console.log(`  [${runtime}] skipping - not configured`);
    return null;
  }

  const payload = { raw: JSON.stringify(largeJson) };
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = await invoke(cfg.jsonProcessFn, payload);
    if ((i + 1) % 10 === 0) console.log(`  [${runtime}] JSON: ${i + 1}/${iterations}`, result);
  }
  return performance.now() - start;
}

async function runCompression(runtime: Runtime, iterations: number): Promise<number | null> {
  const cfg = configs[runtime];
  if (!cfg?.compressionFn) {
    console.log(`  [${runtime}] skipping - not configured`);
    return null;
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = await invoke(cfg.compressionFn, compressionData);
    if ((i + 1) % 10 === 0)
      console.log(`  [${runtime}] Compression: ${i + 1}/${iterations}`, result);
  }
  return performance.now() - start;
}

async function runArrayOps(runtime: Runtime, iterations: number): Promise<number | null> {
  const cfg = configs[runtime];
  if (!cfg?.arrayOpsFn) {
    console.log(`  [${runtime}] skipping - not configured`);
    return null;
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = await invoke(cfg.arrayOpsFn, { size: 100000, seed: i });
    if ((i + 1) % 10 === 0)
      console.log(`  [${runtime}] ArrayOps: ${i + 1}/${iterations}`, result);
  }
  return performance.now() - start;
}

function printResults(label: string, results: Record<Runtime, number | null>) {
  console.log(`\n  Results (${label}):`);
  for (const [runtime, ms] of Object.entries(results) as [Runtime, number | null][]) {
    if (ms !== null) console.log(`    ${runtime}: ${(ms / 1000).toFixed(2)}s`);
  }
}

async function benchmark(
  label: string,
  runtimes: Runtime[],
  iterations: number,
  fn: (runtime: Runtime, iterations: number) => Promise<number | null>,
) {
  console.log(`\n=== ${label} (${iterations} iterations) ===`);
  const results = {} as Record<Runtime, number | null>;
  for (const runtime of runtimes) {
    results[runtime] = await fn(runtime, iterations);
  }
  printResults(label, results);
}

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || "50", 10);

  const argRuntimes = process.argv
    .slice(2)
    .filter((a) => (VALID_RUNTIMES as readonly string[]).includes(a)) as Runtime[];
  const selectedRuntimes = argRuntimes.length > 0 ? argRuntimes : (["bun", "deno", "nodejs"] as Runtime[]);

  console.log("Starting benchmark suite");
  console.log(`Iterations per benchmark: ${iterations}`);
  console.log(`Runtimes: ${selectedRuntimes.join(", ")}`);

  await benchmark("JWT Sign/Validate", selectedRuntimes, iterations, runJwt);
  await benchmark("JSON Process", selectedRuntimes, iterations, runJsonProcess);
  await benchmark("Compression", selectedRuntimes, iterations, runCompression);
  await benchmark("Array Operations", selectedRuntimes, iterations, runArrayOps);

  console.log("\n=== Benchmark complete ===");
}

main().catch(console.error);
