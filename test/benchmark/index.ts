// biome-ignore-all lint/style/noNonNullAssertion: benchmark runner
import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda"
import compressionData from "../fakerdata/generatedJson/compressionData.json"
import jwtPayloads from "../fakerdata/generatedJson/jwtPayloads.json"
import largeJson from "../fakerdata/generatedJson/largeJson.json"

type Runtime = "bun" | "deno" | "nodejs" | "llrt" | "go"
const VALID_RUNTIMES: Runtime[] = ["bun", "deno", "nodejs", "llrt", "go"]
const DEFAULT_RUNTIMES: Runtime[] = ["bun", "deno", "nodejs", "llrt", "go"]
const RUNTIME_SET = new Set<Runtime>(VALID_RUNTIMES)

interface RuntimeConfig {
  signFn?: string
  validateFn?: string
  jsonProcessFn?: string
  compressionFn?: string
  arrayOpsFn?: string
}

const runtimeEnvKeys: Record<Runtime, Partial<Record<keyof RuntimeConfig, string>>> = {
  bun: {
    signFn: "SignBunFunction",
    validateFn: "ValidateBunFunction",
    jsonProcessFn: "JsonProcessBunFunction",
    compressionFn: "CompressionBunFunction",
    arrayOpsFn: "ArrayOpsBunFunction",
  },
  deno: {
    signFn: "SignDenoFunction",
    validateFn: "ValidateDenoFunction",
    jsonProcessFn: "JsonProcessDenoFunction",
    compressionFn: "CompressionDenoFunction",
    arrayOpsFn: "ArrayOpsDenoFunction",
  },
  nodejs: {
    signFn: "SignNodeFunction",
    validateFn: "ValidateNodeFunction",
    jsonProcessFn: "JsonProcessNodeFunction",
    compressionFn: "CompressionNodeFunction",
    arrayOpsFn: "ArrayOpsNodeFunction",
  },
  llrt: {
    jsonProcessFn: "JsonProcessLlrtFunction",
    compressionFn: "CompressionLlrtFunction",
    arrayOpsFn: "ArrayOpsLlrtFunction",
  },
  go: {
    arrayOpsFn: "ArrayOpsGoFunction",
  },
}

const configs: Record<Runtime, RuntimeConfig> = Object.fromEntries(
  VALID_RUNTIMES.map((runtime) => {
    const config = Object.fromEntries(
      Object.entries(runtimeEnvKeys[runtime]).map(([key, envKey]) => [key, process.env[envKey]]),
    ) as RuntimeConfig
    return [runtime, config]
  }),
) as Record<Runtime, RuntimeConfig>

const lambda = new LambdaClient({})

async function invoke(functionName: string, payload: unknown): Promise<unknown> {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      LogType: LogType.Tail,
    }),
  )

  if (response.FunctionError) {
    const fnLabel = functionName.split(":").at(-1) ?? functionName
    const raw = Buffer.from(response.Payload!).toString()
    let detail: string
    try {
      const parsed = JSON.parse(raw)
      detail = parsed.errorMessage ?? raw
    } catch {
      detail = raw
    }
    const logs = response.LogResult ? `\n${Buffer.from(response.LogResult, "base64").toString()}` : ""
    throw new Error(`[${fnLabel}] ${response.FunctionError}: ${detail}${logs}`)
  }

  return JSON.parse(Buffer.from(response.Payload!).toString())
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

interface BenchmarkDef {
  label: string
  isReady: (cfg: RuntimeConfig) => boolean
  step: (cfg: RuntimeConfig, i: number) => Promise<number>
}

interface RuntimeStats {
  mean: number
  p50: number
  p95: number
  p99: number
}

const jsonPayload = { raw: JSON.stringify(largeJson) }
type DurationResponse = { durationMs: number }

async function invokeDuration(functionName: string, payload: unknown): Promise<number> {
  const response = (await invoke(functionName, payload)) as DurationResponse
  return response.durationMs
}

const BENCHMARKS: BenchmarkDef[] = [
  {
    label: "JWT Sign/Validate",
    isReady: (cfg) => !!(cfg.signFn && cfg.validateFn),
    step: async (cfg, i) => {
      const signRes = (await invoke(cfg.signFn!, jwtPayloads[i % jwtPayloads.length])) as {
        token: string
        durationMs: number
      }
      const valRes = (await invoke(cfg.validateFn!, signRes)) as {
        durationMs: number
      }
      return signRes.durationMs + valRes.durationMs
    },
  },
  {
    label: "JSON Process",
    isReady: (cfg) => !!cfg.jsonProcessFn,
    step: (cfg) => invokeDuration(cfg.jsonProcessFn!, jsonPayload),
  },
  {
    label: "Compression",
    isReady: (cfg) => !!cfg.compressionFn,
    step: (cfg) => invokeDuration(cfg.compressionFn!, compressionData),
  },
  {
    label: "Array Operations",
    isReady: (cfg) => !!cfg.arrayOpsFn,
    step: (cfg, i) =>
      invokeDuration(cfg.arrayOpsFn!, {
        size: 100000,
        seed: i,
      }),
  },
]

async function runBenchmark(
  def: BenchmarkDef,
  runtimes: Runtime[],
  warmup: number,
  iterations: number,
): Promise<[Runtime, RuntimeStats | null][]> {
  console.log(`\n=== ${def.label} (${warmup} warmup + ${iterations} iterations) ===`)
  const raw = await Promise.all(
    runtimes.map(async (runtime) => {
      const cfg = configs[runtime]
      if (!cfg || !def.isReady(cfg)) {
        console.log(`  [${runtime}] skipping - not configured`)
        return [runtime, null] as const
      }

      for (let i = 0; i < warmup; i++) {
        await def.step(cfg, i)
      }
      console.log(`  [${runtime}] warmed up`)

      const durations: number[] = []
      for (let i = 0; i < iterations; i++) {
        durations.push(await def.step(cfg, i))
        if ((i + 1) % 10 === 0) console.log(`  [${runtime}] ${def.label}: ${i + 1}/${iterations}`)
      }
      return [runtime, durations] as const
    }),
  )

  const results: [Runtime, RuntimeStats | null][] = raw.map(([runtime, durations]) => {
    if (durations == null) return [runtime, null]
    const sorted = [...durations].sort((a, b) => a - b)
    const mean = durations.reduce((s, v) => s + v, 0) / durations.length
    return [runtime, { mean, p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99) }]
  })

  console.log(`\n  Results (${def.label}):`)
  for (const [runtime, stats] of results) {
    if (stats != null) {
      console.log(
        `    ${runtime}: mean=${stats.mean.toFixed(1)}ms  p50=${stats.p50.toFixed(1)}ms  p95=${stats.p95.toFixed(1)}ms  p99=${stats.p99.toFixed(1)}ms`,
      )
    }
  }

  return results
}

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || "100", 10)
  const warmup = parseInt(process.env.WARMUP_ITERATIONS || "3", 10)
  const argRuntimes = process.argv.slice(2).filter((a): a is Runtime => RUNTIME_SET.has(a as Runtime))
  const selectedRuntimes = argRuntimes.length > 0 ? argRuntimes : DEFAULT_RUNTIMES

  console.log("Starting benchmark suite")
  console.log(`Iterations: ${iterations}`)
  console.log(`Warmup:     ${warmup}`)
  console.log(`Runtimes:   ${selectedRuntimes.join(", ")}`)

  const allResults: { label: string; entries: [Runtime, RuntimeStats | null][] }[] = []
  for (const def of BENCHMARKS) {
    allResults.push({ label: def.label, entries: await runBenchmark(def, selectedRuntimes, warmup, iterations) })
  }

  console.log("\n=== Benchmark complete ===")

  // Combined copy-pasteable summary
  const maxRuntimeLen = Math.max(...selectedRuntimes.map((r) => r.length))
  const lines: string[] = [
    "",
    `Iterations: ${iterations}`,
    `Warmup:     ${warmup}`,
    `Runtimes:   ${selectedRuntimes.join(", ")}`,
  ]
  for (const { label, entries } of allResults) {
    const valid = entries.filter((e): e is [Runtime, RuntimeStats] => e[1] != null)
    if (valid.length === 0) continue
    const meanW = Math.max(...valid.map(([, s]) => `mean=${s.mean.toFixed(1)}ms`.length))
    const p50W = Math.max(...valid.map(([, s]) => `p50=${s.p50.toFixed(1)}ms`.length))
    const p95W = Math.max(...valid.map(([, s]) => `p95=${s.p95.toFixed(1)}ms`.length))
    lines.push("")
    lines.push(`Results (${label}):`)
    for (const [runtime, stats] of valid) {
      const rLabel = `${runtime}:`.padEnd(maxRuntimeLen + 1)
      const fMean = `mean=${stats.mean.toFixed(1)}ms`.padEnd(meanW)
      const fP50 = `p50=${stats.p50.toFixed(1)}ms`.padEnd(p50W)
      const fP95 = `p95=${stats.p95.toFixed(1)}ms`.padEnd(p95W)
      lines.push(`  ${rLabel}  ${fMean}  ${fP50}  ${fP95}  p99=${stats.p99.toFixed(1)}ms`)
    }
  }
  console.log(lines.join("\n"))
}

main().catch(console.error)
