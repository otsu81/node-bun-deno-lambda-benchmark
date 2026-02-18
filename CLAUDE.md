# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a benchmark project comparing Bun, Node, and Deno runtime performance on AWS Lambda. Each runtime runs identical workloads (JWT sign/validate, JSON processing, gzip compression, array operations) deployed as Lambda functions.

## Package Roots

This repo has **two separate package.json files** with different runtimes:

- `/package.json` — CDK infrastructure (Node/npm), TypeScript compiled via `tsc`
- `/src/bun/package.json` — Bun Lambda handlers (Bun runtime), no build step needed

Deno uses `src/deno/deno.json` for import maps (no package.json).

## Common Commands

### Infrastructure (root)
```sh
npm run build        # tsc compile
npm test             # jest (CDK snapshot tests in test/*.test.ts)
npx cdk deploy --outputs-file cdk-outputs.json
npx cdk synth
```

### Deploying and running benchmarks
```sh
# After deploy, extract Lambda ARNs as env vars:
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env

# Run all runtimes (default 50 iterations):
bun run test/benchmark/index.ts

# Run specific runtimes or change iteration count:
ITERATIONS=100 bun run test/benchmark/index.ts bun deno nodejs
```

### Generating test fixtures
```sh
bun run test/fakerdata/generateFaker.ts           # JWT payloads
bun run test/fakerdata/generateLargeJson.ts       # large JSON
bun run test/fakerdata/generateCompressionData.ts
```

## Architecture

### Three Runtime Patterns

**Bun & Deno — Docker + LWA (AWS Lambda Web Adapter)**

Each handler is an HTTP server (port 8080). The Docker image bundles `aws-lambda-adapter` (LWA) which translates Lambda invocations into HTTP requests, so handlers never touch the Lambda event/context API directly.

```
Lambda Invoke → LWA (port 8080) → Bun.serve() / Deno.serve() → HTTP response → LWA → Lambda response
```

GET requests return `"OK"` for the LWA readiness check (`AWS_LWA_READINESS_CHECK_PATH=/`).

- Bun: `Bun.serve({ port: 8080, fetch(req) { ... } })`
- Deno: `Deno.serve({ port: 8080, handler: async (req) => { ... } })`; uses `node:` prefixed imports for Node compat modules (crypto, buffer)

**Node — Managed Lambda Runtime**

Node handlers use the standard Lambda export pattern (`export const handler = async (event) => ...`) and are deployed using `NodejsFunction` (esbuild bundled, Node 24.x). No Docker or LWA involved.

### Deno Dockerfile Build Strategy

The Deno Dockerfile pre-compiles and caches all handlers at image build time to minimize cold starts:
1. `deno cache` — downloads all npm deps into `DENO_DIR=/var/deno_dir`
2. Warmup runs — starts each handler with a 10s timeout so Deno fully JIT-compiles and caches code (exit 124 = timeout = success)

Deno functions have a 15s Lambda timeout (vs 10s default for Bun).

### CDK Stack (`lib/node-bun-deno-stack.ts`)

`ContainerLambda` is a CDK Construct wrapping `DockerImageFunction` used for both Bun and Deno. The `cmd` prop overrides the Dockerfile `CMD` to select the handler (e.g. `["bun", "jwtSign/index.ts"]`).

`NodeLambda` wraps `NodejsFunction` with esbuild bundling for the managed Node runtime.

Lambda functions are chained as CDK dependencies to avoid IAM race conditions during deployment.

### Benchmark Runner (`test/benchmark/index.ts`)

Reads Lambda ARNs from env vars (populated from `cdk-outputs.json` via `.env`). Invokes each function sequentially via `@aws-sdk/client-lambda`. Accepts runtime names as CLI args (`bun`, `deno`, `nodejs`); runs all three if none provided. Logs progress every 10 iterations.
