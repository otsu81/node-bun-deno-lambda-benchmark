import { InputSchema, compress } from "../../common/compression.ts";

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK");

    const { data } = InputSchema.parse(await req.json());
    const result = compress(data);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
