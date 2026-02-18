import { InputSchema, compress } from "../../common/compression.ts";

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const { data } = InputSchema.parse(await req.json());
    const result = compress(data);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
