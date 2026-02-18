# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a benchmark project comparing Bun, Node, and Deno runtime performance on AWS Lambda. Each runtime runs a set of identical workloads (JWT sign/validate, JSON processing, gzip compression, array operations) deployed as Docker-based Lambda functions.

## Two Package Roots

This repo has **two separate package.json files** with different runtimes:

- `/package.json` — CDK infrastructure (Node/npm), TypeScript compiled via `tsc`
- `/src/bun/package.json` — Bun Lambda handlers (Bun runtime), no build step needed

## Common Commands

### Infrastructure (root)
```sh
npm run build        # tsc compile
npm test             # jest (CDK snapshot tests in test/*.test.ts)
npx cdk deploy --outputs-file cdk-outputs.json   # deploy stack to AWS
npx cdk synth        # synthesize CloudFormation template
```

### Deploying and running benchmarks
```sh
# After deploy, extract Lambda ARNs as env vars:
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env

# Run benchmark (uses bun, reads .env for Lambda function ARNs):
bun run test/benchmark/index.ts
ITERATIONS=100 bun run test/benchmark/index.ts
```

### Generating test fixtures
```sh
bun run test/fakerdata/generateFaker.ts          # JWT payloads
bun run test/fakerdata/generateLargeJson.ts      # large JSON
bun run test/fakerdata/generateCompressionData.ts
```

## Architecture

### Lambda Handler Pattern (src/bun/)

Each handler is a native `Bun.serve()` HTTP server on port 8080. The Docker image bundles [`aws-lambda-adapter`](https://github.com/awslabs/aws-lambda-web-adapter) (LWA) which translates Lambda invocation events into HTTP requests — so the handler never uses the Lambda event/context API directly.

```
Lambda Invoke → LWA (port 8080) → Bun.serve() handler → HTTP response → LWA → Lambda response
```

GET requests return `"OK"` for the LWA readiness check (`AWS_LWA_READINESS_CHECK_PATH=/`).

### CDK Stack (lib/node-bun-deno-stack.ts)

`BunLambda` is a CDK Construct wrapping a `DockerImageFunction` built from `src/bun/`. The `handler` prop sets the `CMD` passed to bun (e.g. `"jwtSign/index.ts"`). Lambda functions are chained as dependencies to avoid IAM race conditions during deployment.

### Benchmark Runner (test/benchmark/index.ts)

Reads Lambda ARNs from env vars (populated from `cdk-outputs.json` via `.env`). Invokes each function sequentially via `@aws-sdk/client-lambda` and logs progress every 10 iterations.

### Branches

- `main` — baseline
- `jwt` — JWT benchmark work
- `deno` — Deno runtime implementation (current)

Deno handlers (when added) will follow the same pattern as `src/bun/` but in `src/deno/`.
