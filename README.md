# Bun vs Node vs Deno

This is a benchmark stack to measure runtime performance in AWS Lambda. You can find the associated blog post here.

To run

```
npx cdk deploy --outputs-file cdk-outputs.json
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env
bun run test/benchmark/index.ts
```
