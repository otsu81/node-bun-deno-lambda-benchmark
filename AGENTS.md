# Repository Guidelines

## Project Structure & Module Organization
- `bin/` and `lib/` contain the AWS CDK app and stack definitions.
- `src/common/` holds shared benchmark logic (JWT, compression, JSON processing, array ops).
- Runtime-specific Lambda handlers live in `src/node/`, `src/bun/`, `src/deno/`, and `src/go/`.
- `test/benchmark/` contains the end-to-end benchmark runner; `test/sign-validate/` runs JWT sign/validate cycles.
- Generated fixtures are under `test/fakerdata/generatedJson/`; mock keys are in `test/mockKeys/` and are test-only.

## Build, Test, and Development Commands
- `npm run build`: compile TypeScript CDK code into `dist/`.
- `npm run watch`: run TypeScript compiler in watch mode while editing infra code.
- `npm test`: run Jest tests (add/keep unit tests here as the suite grows).
- `npm run lint:fix`: run Biome and auto-fix formatting/lint issues.
- `npx cdk deploy --outputs-file cdk-outputs.json`: deploy benchmark Lambdas and export function names.
- `jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env`: generate env vars for runners.
- `bun run test/benchmark/index.ts`: execute runtime benchmarks against deployed functions.

## Coding Style & Naming Conventions
- TypeScript uses strict mode (`strict`, `noImplicitAny`, `strictNullChecks` enabled).
- Formatting is enforced by Biome: spaces for indentation, max line width `120`, semicolons set to `asNeeded`.
- Prefer descriptive camelCase for variables/functions, PascalCase for types/interfaces, and kebab-case for commit subjects.
- Keep shared logic in `src/common/` and thin runtime adapters in each runtime folder.

## Testing Guidelines
- Place benchmark/integration scripts under `test/<area>/index.ts`.
- Name supporting test data clearly by purpose (example: `compressionData.json`, `jwtPayloads.json`).
- Before performance comparisons, deploy fresh infra and regenerate `.env` from `cdk-outputs.json`.
- Use `WARMUP_ITERATIONS` and `ITERATIONS` env vars to tune benchmark runs.

## Commit & Pull Request Guidelines
- Follow existing history style: short, imperative, lowercase subjects (example: `add go benchmark`, `refactor stack`).
- Keep commits focused to one concern (infra, runtime handler, benchmark logic, or test data).
- PRs should include: summary of changes, benchmark impact (if relevant), deployment/test commands run, and linked issue.
- Include console output snippets or metric tables when changing benchmark behavior.
