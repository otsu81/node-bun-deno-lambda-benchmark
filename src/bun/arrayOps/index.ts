import { InputSchema, runArrayOps } from "../../common/arrayOps.ts";

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const { size, seed } = InputSchema.parse(await req.json());
    const result = runArrayOps(size, seed);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
