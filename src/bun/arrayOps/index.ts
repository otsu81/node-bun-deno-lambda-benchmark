import { InputSchema, runArrayOps } from "../../common/arrayOps.ts";

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const body = await req.json();
    const start = performance.now();
    const { size, seed } = InputSchema.parse(body);
    const result = runArrayOps(size, seed);
    const durationMs = performance.now() - start;

    return new Response(JSON.stringify({ ...result, durationMs }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
