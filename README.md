# Bun vs Node vs Deno

This is a benchmark stack to measure runtime performance in AWS Lambda, comparing Bun, Deno, and the native Node runtimes. You can find the associated blog post [here](https://blog.otsu.dev/posts/2026/node-bun-deno-lambda.html).

To run

```
npx cdk deploy --outputs-file cdk-outputs.json
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env
bun run test/benchmark/index.ts
```
