import { LambdaClient, InvokeCommand, LogType } from "@aws-sdk/client-lambda";
import jwtPayloads from "../fakerdata/generatedJson/jwtPayloads.json";
import compressionData from "../fakerdata/generatedJson/compressionData.json";
import largeJson from "../fakerdata/generatedJson/largeJson.json";

const VALID_RUNTIMES = ["bun", "deno", "nodejs", "go"] as const;
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
  go: {
    arrayOpsFn: process.env.ArrayOpsGoFunction,
  },
};

const lambda = new LambdaClient({});

async function invoke(
  functionName: string,
  payload: unknown,
): Promise<unknown> {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      LogType: LogType.Tail,
    }),
  );

  if (response.FunctionError) {
    const fnLabel = functionName.split(":").at(-1) ?? functionName;
    const raw = Buffer.from(response.Payload!).toString();
    let detail: string;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.errorMessage ?? raw;
    } catch {
      detail = raw;
    }
    const logs = response.LogResult
      ? "\n" + Buffer.from(response.LogResult, "base64").toString()
      : "";
    throw new Error(`[${fnLabel}] ${response.FunctionError}: ${detail}${logs}`);
  }

  return JSON.parse(Buffer.from(response.Payload!).toString());
}

interface BenchmarkDef {
  label: string;
  isReady: (cfg: RuntimeConfig) => boolean;
  step: (cfg: RuntimeConfig, i: number) => Promise<number>;
}

const jsonPayload = { raw: JSON.stringify(largeJson) };

const BENCHMARKS: BenchmarkDef[] = [
  {
    label: "JWT Sign/Validate",
    isReady: (cfg) => !!(cfg.signFn && cfg.validateFn),
    step: async (cfg, i) => {
      const signRes = await invoke(cfg.signFn!, jwtPayloads[i % jwtPayloads.length]) as { token: string; durationMs: number };
      const valRes = await invoke(cfg.validateFn!, signRes) as { durationMs: number };
      return signRes.durationMs + valRes.durationMs;
    },
  },
  {
    label: "JSON Process",
    isReady: (cfg) => !!cfg.jsonProcessFn,
    step: async (cfg) => {
      const res = await invoke(cfg.jsonProcessFn!, jsonPayload) as { durationMs: number };
      return res.durationMs;
    },
  },
  {
    label: "Compression",
    isReady: (cfg) => !!cfg.compressionFn,
    step: async (cfg) => {
      const res = await invoke(cfg.compressionFn!, compressionData) as { durationMs: number };
      return res.durationMs;
    },
  },
  {
    label: "Array Operations",
    isReady: (cfg) => !!cfg.arrayOpsFn,
    step: async (cfg, i) => {
      const res = await invoke(cfg.arrayOpsFn!, { size: 100000, seed: i }) as { durationMs: number };
      return res.durationMs;
    },
  },
];

async function runBenchmark(
  def: BenchmarkDef,
  runtimes: Runtime[],
  iterations: number,
) {
  console.log(`\n=== ${def.label} (${iterations} iterations) ===`);
  const entries = await Promise.all(
    runtimes.map(async (runtime) => {
      const cfg = configs[runtime];
      if (!cfg || !def.isReady(cfg)) {
        console.log(`  [${runtime}] skipping - not configured`);
        return [runtime, null] as const;
      }

      let totalMs = 0;
      for (let i = 0; i < iterations; i++) {
        totalMs += await def.step(cfg, i);
        if ((i + 1) % 10 === 0)
          console.log(`  [${runtime}] ${def.label}: ${i + 1}/${iterations}`);
      }
      return [runtime, totalMs] as const;
    }),
  );

  console.log(`\n  Results (${def.label}):`);
  for (const [runtime, ms] of entries) {
    if (ms != null) {
      console.log(
        `    ${runtime}: ${(ms / 1000).toFixed(2)}s total  (${(ms / iterations).toFixed(1)}ms/iter, computation only)`,
      );
    }
  }
}

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || "50", 10);
  const argRuntimes = process.argv
    .slice(2)
    .filter((a) =>
      (VALID_RUNTIMES as readonly string[]).includes(a),
    ) as Runtime[];
  const selectedRuntimes =
    argRuntimes.length > 0
      ? argRuntimes
      : (["bun", "deno", "nodejs", "go"] as Runtime[]);

  console.log("Starting benchmark suite");
  console.log(`Iterations: ${iterations}`);
  console.log(`Runtimes:   ${selectedRuntimes.join(", ")}`);

  for (const def of BENCHMARKS) {
    await runBenchmark(def, selectedRuntimes, iterations);
  }

  console.log("\n=== Benchmark complete ===");
}

main().catch(console.error);
