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

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi
    ? sorted[lo]
    : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
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
      const signRes = (await invoke(
        cfg.signFn!,
        jwtPayloads[i % jwtPayloads.length],
      )) as { token: string; durationMs: number };
      const valRes = (await invoke(cfg.validateFn!, signRes)) as {
        durationMs: number;
      };
      return signRes.durationMs + valRes.durationMs;
    },
  },
  {
    label: "JSON Process",
    isReady: (cfg) => !!cfg.jsonProcessFn,
    step: async (cfg) => {
      const res = (await invoke(cfg.jsonProcessFn!, jsonPayload)) as {
        durationMs: number;
      };
      return res.durationMs;
    },
  },
  {
    label: "Compression",
    isReady: (cfg) => !!cfg.compressionFn,
    step: async (cfg) => {
      const res = (await invoke(cfg.compressionFn!, compressionData)) as {
        durationMs: number;
      };
      return res.durationMs;
    },
  },
  {
    label: "Array Operations",
    isReady: (cfg) => !!cfg.arrayOpsFn,
    step: async (cfg, i) => {
      const res = (await invoke(cfg.arrayOpsFn!, {
        size: 100000,
        seed: i,
      })) as { durationMs: number };
      return res.durationMs;
    },
  },
];

async function runBenchmark(
  def: BenchmarkDef,
  runtimes: Runtime[],
  warmup: number,
  iterations: number,
) {
  console.log(
    `\n=== ${def.label} (${warmup} warmup + ${iterations} iterations) ===`,
  );
  const entries = await Promise.all(
    runtimes.map(async (runtime) => {
      const cfg = configs[runtime];
      if (!cfg || !def.isReady(cfg)) {
        console.log(`  [${runtime}] skipping - not configured`);
        return [runtime, null] as const;
      }

      for (let i = 0; i < warmup; i++) {
        await def.step(cfg, i);
      }
      console.log(`  [${runtime}] warmed up`);

      const durations: number[] = [];
      for (let i = 0; i < iterations; i++) {
        durations.push(await def.step(cfg, i));
        if ((i + 1) % 10 === 0)
          console.log(`  [${runtime}] ${def.label}: ${i + 1}/${iterations}`);
      }
      return [runtime, durations] as const;
    }),
  );

  console.log(`\n  Results (${def.label}):`);
  for (const [runtime, durations] of entries) {
    if (durations != null) {
      const sorted = [...durations].sort((a, b) => a - b);
      const mean = durations.reduce((s, v) => s + v, 0) / durations.length;
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);
      console.log(
        `    ${runtime}: mean=${mean.toFixed(1)}ms  p50=${p50.toFixed(1)}ms  p95=${p95.toFixed(1)}ms  p99=${p99.toFixed(1)}ms`,
      );
    }
  }
}

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || "100", 10);
  const warmup = parseInt(process.env.WARMUP_ITERATIONS || "3", 10);
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
  console.log(`Warmup:     ${warmup}`);
  console.log(`Runtimes:   ${selectedRuntimes.join(", ")}`);

  for (const def of BENCHMARKS) {
    await runBenchmark(def, selectedRuntimes, warmup, iterations);
  }

  console.log("\n=== Benchmark complete ===");
}

main().catch(console.error);
