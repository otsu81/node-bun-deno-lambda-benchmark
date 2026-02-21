# Bun vs Node vs Deno

This is a benchmark stack to measure runtime performance in AWS Lambda. Primary focus was to evaluate how Bun, Deno and native Node runtimes stacked against eachother, but as a curiosity benchmarks for [LLRT](https://github.com/awslabs/llrt) and Go have been added as well. You can find the associated blog post [here](https://blog.otsu.dev/posts/2026/node-bun-deno-lambda.html).

To run

```
npx cdk deploy --outputs-file cdk-outputs.json
jq -r '.NodeBunDenoStack | to_entries[] | "\(.key)=\(.value)"' cdk-outputs.json > .env
bun run test/benchmark/index.ts
```

Example results, running on `eu-north-1` with 1,024MB Lambda on X86_64: 

```sh
Iterations: 100
Warmup:     3
Runtimes:   bun, deno, nodejs, llrt, go

Results (JWT Sign/Validate):
  bun:     mean=1.0ms  p50=0.8ms  p95=2.0ms  p99=3.8ms
  deno:    mean=1.3ms  p50=1.1ms  p95=1.8ms  p99=8.2ms
  nodejs:  mean=1.1ms  p50=1.0ms  p95=1.5ms  p99=1.9ms

Results (JSON Process):
  bun:     mean=10.8ms  p50=7.8ms   p95=16.5ms  p99=20.1ms
  deno:    mean=14.5ms  p50=16.8ms  p95=21.2ms  p99=22.1ms
  nodejs:  mean=13.9ms  p50=13.8ms  p95=18.6ms  p99=22.8ms
  llrt:    mean=47.0ms  p50=49.2ms  p95=50.2ms  p99=58.0ms

Results (Compression):
  bun:     mean=3.5ms  p50=3.4ms  p95=3.8ms  p99=4.0ms
  deno:    mean=3.0ms  p50=2.9ms  p95=3.5ms  p99=3.6ms
  nodejs:  mean=4.1ms  p50=4.1ms  p95=4.4ms  p99=4.7ms
  llrt:    mean=2.5ms  p50=2.5ms  p95=2.6ms  p99=2.6ms

Results (Array Operations):
  bun:     mean=129.6ms  p50=131.6ms  p95=136.3ms  p99=143.8ms
  deno:    mean=229.7ms  p50=226.3ms  p95=243.6ms  p99=277.6ms
  nodejs:  mean=315.1ms  p50=302.9ms  p95=374.7ms  p99=378.2ms
  llrt:    mean=724.4ms  p50=723.0ms  p95=742.7ms  p99=793.8ms
  go:      mean=62.4ms   p50=60.7ms   p95=75.1ms   p99=80.1ms
```
