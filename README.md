# Bun vs Node vs Deno

WIP

To run

```
npx cdk deploy --outputs-file cdk-outputs.json
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env
bun run test/benchmark/index.ts
```
