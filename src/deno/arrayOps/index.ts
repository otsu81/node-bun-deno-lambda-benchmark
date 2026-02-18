import { InputSchema, runArrayOps } from "../../common/arrayOps.ts";

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK");

    const { size, seed } = InputSchema.parse(await req.json());
    const result = runArrayOps(size, seed);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
